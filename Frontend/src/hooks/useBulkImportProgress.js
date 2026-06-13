// hooks/useBulkImportProgress.js - FIXED

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, isSocketConnected } from '../services/socket';

const useBulkImportProgress = () => {
    const [progress, setProgress] = useState({
        importId: null,
        status: 'idle',
        stage: 'starting',
        percentage: 0,
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        currentItem: null,
        errors: [],
        skippedStudents: [],
        message: ''
    });

    const [socketReady, setSocketReady] = useState(false);
    const mountedRef = useRef(true);
    const pollingIntervalRef = useRef(null);
    const retryCountRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const checkSocket = () => {
            const connected = isSocketConnected();
            setSocketReady(connected);
        };

        checkSocket();
        const interval = setInterval(checkSocket, 2000);
        return () => clearInterval(interval);
    }, []);

    const startPolling = useCallback((importId) => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        console.log('🔄 Starting polling for import:', importId);
        retryCountRef.current = 0;

        pollingIntervalRef.current = setInterval(async () => {
            if (!mountedRef.current) return;

            try {
                // Try to get progress from the backend if you have an endpoint
                // For now, we'll rely on WebSocket events
                console.log('Polling for import progress:', importId);
            } catch (error) {
                console.error('Polling error:', error);
                retryCountRef.current++;

                if (retryCountRef.current > 30 && mountedRef.current) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                    setProgress(prev => ({
                        ...prev,
                        status: 'error',
                        message: 'Failed to connect to server. Please check your connection.'
                    }));
                }
            }
        }, 2000);
    }, []);

    const subscribeToImport = useCallback((importId, type = 'bulk-import') => {
        if (!importId) return;

        const socket = getSocket();

        console.log(`🎯 Subscribing to import ${importId} with type ${type}`);
        console.log(`📡 Socket exists: ${!!socket}, Connected: ${isSocketConnected()}`);

        if (!socket || !isSocketConnected()) {
            console.warn('⚠️ Socket not ready, using polling');
            startPolling(importId);
            return () => { };
        }

        // 🔥 DEBUG: Listen to ALL events to see what's coming
        const debugAllEvents = (eventName, ...args) => {
            console.log(`🔔 ALL SOCKET EVENT: ${eventName}`, args[0]);
        };
        socket.onAny(debugAllEvents);

        const events = {
            'bulk-import': {
                started: 'bulk-import:started',
                progress: 'bulk-import:progress',
                complete: 'bulk-import:complete',
                error: 'bulk-import:error'
            },
            'bulk-photo': {
                started: 'bulk-photo:started',
                progress: 'bulk-photo:progress',
                complete: 'bulk-photo:complete',
                error: 'bulk-import:error'
            }
        };

        const eventNames = events[type] || events['bulk-import'];

        const handleStarted = (data) => {
            console.log('🎬 Received started event:', data);
            if (data.importId === importId && mountedRef.current) {
                setProgress({
                    importId: data.importId,
                    status: 'processing',
                    stage: data.stage || 'starting',
                    percentage: 0,
                    total: data.total || 0,
                    processed: 0,
                    created: 0,
                    updated: 0,
                    skipped: 0,
                    currentItem: null,
                    errors: [],
                    skippedStudents: [],
                    message: data.message || 'Starting import...'
                });
            }
        };

        const handleProgress = (data) => {
            console.log('📊 Received progress event:', data);
            if (data.importId === importId && mountedRef.current) {
                setProgress(prev => {
                    console.log('Updating progress from', prev.percentage, 'to', data.percentage);
                    return {
                        ...prev,
                        stage: data.stage || prev.stage,
                        percentage: data.percentage || 0,
                        total: data.total || prev.total,
                        processed: data.processed || 0,
                        created: data.created || 0,
                        updated: data.updated || 0,
                        skipped: data.skipped || 0,
                        currentItem: data.currentItem || null,
                        message: data.message || prev.message
                    };
                });
            }
        };

        const handleComplete = (data) => {
            console.log('✅ Received complete event:', data);
            if (data.importId === importId && mountedRef.current) {
                setProgress({
                    importId: data.importId,
                    status: 'completed',
                    stage: 'completed',
                    percentage: 100,
                    total: data.total || 0,
                    processed: data.total || 0,
                    created: data.created || 0,
                    updated: data.updated || 0,
                    skipped: data.skipped || 0,
                    currentItem: null,
                    errors: data.errors || [],
                    skippedStudents: data.skippedStudents || [],
                    message: data.message || 'Import completed!'
                });

                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            }
        };

        const handleError = (data) => {
            console.log('❌ Received error event:', data);
            if (data.importId === importId && mountedRef.current) {
                setProgress(prev => ({
                    ...prev,
                    status: 'error',
                    message: data.message || 'Import failed',
                    errors: data.errors || []
                }));
            }
        };

        socket.on(eventNames.started, handleStarted);
        socket.on(eventNames.progress, handleProgress);
        socket.on(eventNames.complete, handleComplete);
        socket.on(eventNames.error, handleError);

        // Return cleanup function
        return () => {
            console.log(`🧹 Cleaning up listeners for ${importId}`);
            socket.off(eventNames.started, handleStarted);
            socket.off(eventNames.progress, handleProgress);
            socket.off(eventNames.complete, handleComplete);
            socket.off(eventNames.error, handleError);
            socket.offAny(debugAllEvents);
        };
    }, [startPolling]);

    const resetProgress = useCallback(() => {
        if (mountedRef.current) {
            setProgress({
                importId: null,
                status: 'idle',
                stage: 'starting',
                percentage: 0,
                total: 0,
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
                currentItem: null,
                errors: [],
                skippedStudents: [],
                message: ''
            });
        }
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        retryCountRef.current = 0;
    }, []);

    return { progress, socketReady, subscribeToImport, resetProgress };
};

export default useBulkImportProgress;