// hooks/useBulkImportProgress.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, isSocketConnected } from '../services/socket';

const useBulkImportProgress = () => {
    const [progress, setProgress] = useState({
        importId: null,
        status: 'idle', // idle, processing, completed, error
        stage: 'starting', // parsing_csv, extracting_photos, saving_students, completed
        percentage: 0,
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        currentItem: null,
        errors: [],
        message: ''
    });

    const [socketReady, setSocketReady] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Check socket connection
    useEffect(() => {
        const checkSocket = () => {
            const connected = isSocketConnected();
            setSocketReady(connected);
        };

        checkSocket();
        const interval = setInterval(checkSocket, 2000);
        return () => clearInterval(interval);
    }, []);

    const subscribeToImport = useCallback((importId, type = 'bulk-import') => {
        if (!importId) return;

        const socket = getSocket();
        if (!socket || !isSocketConnected()) {
            console.warn('Socket not ready for bulk import progress');
            return;
        }

        // Event names based on type
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
                    message: data.message || 'Starting import...'
                });
            }
        };

        const handleProgress = (data) => {
            if (data.importId === importId && mountedRef.current) {
                setProgress(prev => ({
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
                }));
            }
        };

        const handleComplete = (data) => {
            if (data.importId === importId && mountedRef.current) {
                setProgress({
                    ...progress,
                    importId: data.importId,
                    status: 'completed',
                    stage: 'completed',
                    percentage: 100,
                    total: data.total || 0,
                    created: data.created || 0,
                    updated: data.updated || 0,
                    skipped: data.skipped || 0,
                    errors: data.errors || [],
                    message: data.message || 'Import completed!'
                });
            }
        };

        const handleError = (data) => {
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

        return () => {
            socket.off(eventNames.started, handleStarted);
            socket.off(eventNames.progress, handleProgress);
            socket.off(eventNames.complete, handleComplete);
            socket.off(eventNames.error, handleError);
        };
    }, []);

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
                message: ''
            });
        }
    }, []);

    return { progress, socketReady, subscribeToImport, resetProgress };
};

export default useBulkImportProgress;