// hooks/useBatchProgress.js - COMPLETE FIX
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, isSocketConnected } from '../services/socket';

const useBatchProgress = () => {
    const [progress, setProgress] = useState({
        batchId: null,
        status: 'idle',
        percentage: 0,
        processed: 0,
        generated: 0,
        failed: 0,
        total: 0,
        currentStudent: null,
        failedStudents: [],
        message: '',
        eta: null
    });

    const startTimeRef = useRef(null);
    const [socketReady, setSocketReady] = useState(false);

    const formatETA = useCallback((seconds) => {
        if (!seconds || seconds < 0) return 'Calculating...';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        if (mins > 0) {
            return `${mins} min${mins > 1 ? 's' : ''} ${secs} sec${secs > 1 ? 's' : ''}`;
        }
        return `${secs} second${secs > 1 ? 's' : ''}`;
    }, []);

    const calculateETA = useCallback((processed, total, elapsedSeconds) => {
        if (processed === 0 || total === 0 || elapsedSeconds < 1) return null;
        const itemsPerSecond = processed / elapsedSeconds;
        const remainingItems = total - processed;
        const remainingSeconds = remainingItems / itemsPerSecond;
        return remainingSeconds > 0 && remainingSeconds < 3600 ? remainingSeconds : null;
    }, []);

    const resetProgress = useCallback(() => {
        setProgress({
            batchId: null,
            status: 'idle',
            percentage: 0,
            processed: 0,
            generated: 0,
            failed: 0,
            total: 0,
            currentStudent: null,
            failedStudents: [],
            message: '',
            eta: null
        });
        startTimeRef.current = null;
    }, []);

    // Check socket availability
    useEffect(() => {
        const checkSocket = () => {
            const connected = isSocketConnected();
            const socket = getSocket();
            const isReady = connected && socket !== null;

            if (isReady !== socketReady) {
                console.log('📡 Socket state changed:', { connected, isReady });
                setSocketReady(isReady);
            }
        };

        checkSocket();
        const interval = setInterval(checkSocket, 1000);
        return () => clearInterval(interval);
    }, [socketReady]);

    // Listen to batch events
    useEffect(() => {
        const socket = getSocket();

        if (!socketReady || !socket) {
            console.log('⏳ Waiting for socket connection...');
            return;
        }

        console.log('🎯 Setting up batch progress listeners, socket ID:', socket.id);

        const handleBatchStarted = (data) => {
            console.log('📦 Batch started event received:', data);
            startTimeRef.current = Date.now();
            setProgress(prev => ({
                ...prev,
                batchId: data.batchId,
                status: 'generating',
                total: data.total || 0,
                message: data.message || 'Starting batch generation...',
                percentage: 0,
                processed: 0,
                generated: 0,
                failed: 0
            }));
        };

        const handleBatchProgress = (data) => {
            console.log('📊 Batch progress event received:', data);

            let eta = null;
            if (startTimeRef.current && data.processed > 0 && data.processed < data.total) {
                const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
                eta = calculateETA(data.processed, data.total, elapsedSeconds);
            }

            setProgress(prev => {
                let failedStudents = [...prev.failedStudents];
                if (data.currentStudent?.error) {
                    const alreadyRecorded = failedStudents.some(
                        s => s.id === data.currentStudent.id
                    );
                    if (!alreadyRecorded) {
                        failedStudents.push({
                            name: data.currentStudent.name,
                            id: data.currentStudent.id,
                            reason: data.currentStudent.error
                        });
                    }
                }

                return {
                    ...prev,
                    batchId: data.batchId || prev.batchId,
                    status: 'generating',
                    percentage: data.percentage || 0,
                    processed: data.processed || 0,
                    generated: data.generated || 0,
                    failed: data.failed || 0,
                    total: data.total || prev.total,
                    currentStudent: data.currentStudent || null,
                    failedStudents,
                    message: data.message || `Processing ${data.processed || 0} of ${data.total || 0}...`,
                    eta: eta ? formatETA(eta) : null
                };
            });
        };

        const handleBatchComplete = (data) => {
            console.log('✅ Batch complete event received:', data);
            setProgress(prev => ({
                ...prev,
                status: 'completed',
                percentage: 100,
                generated: data.stats?.generated || prev.generated,
                failed: data.stats?.failed || prev.failed,
                message: data.message || 'Batch generation complete!',
                eta: null
            }));
        };

        const handleBatchError = (data) => {
            console.log('❌ Batch error event received:', data);
            setProgress(prev => ({
                ...prev,
                status: 'error',
                message: data.error || 'An error occurred',
                eta: null
            }));
        };

        // Register event listeners
        socket.on('card:batch-started', handleBatchStarted);
        socket.on('card:batch-progress', handleBatchProgress);
        socket.on('card:batch-complete', handleBatchComplete);
        socket.on('card:batch-error', handleBatchError);

        console.log('✅ Batch progress listeners registered');

        return () => {
            console.log('🧹 Cleaning up batch progress listeners');
            socket.off('card:batch-started', handleBatchStarted);
            socket.off('card:batch-progress', handleBatchProgress);
            socket.off('card:batch-complete', handleBatchComplete);
            socket.off('card:batch-error', handleBatchError);
        };
    }, [socketReady, calculateETA, formatETA]);

    return { progress, resetProgress, socketReady };
};

export default useBatchProgress;