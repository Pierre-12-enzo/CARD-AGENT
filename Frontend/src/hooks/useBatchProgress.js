// hooks/useBatchProgress.js - ADD DELAY BEFORE POLLING
import { useState, useEffect, useCallback, useRef } from 'react';
import { cardAPI } from '../services/api';

const useBatchProgress = () => {
    const [progress, setProgress] = useState({
        batchId: null,
        status: 'idle',
        percentage: 0,
        processed: 0,
        generated: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        currentStudent: null,
        failedStudents: [],
        skippedStudents: [],
        message: '',
        eta: null
    });

    const startTimeRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const mountedRef = useRef(true);
    const retryCountRef = useRef(0);

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
        if (mountedRef.current) {
            setProgress({
                batchId: null,
                status: 'idle',
                percentage: 0,
                processed: 0,
                generated: 0,
                failed: 0,
                skipped: 0,
                total: 0,
                currentStudent: null,
                failedStudents: [],
                skippedStudents: [],
                message: '',
                eta: null
            });
        }
        startTimeRef.current = null;
        retryCountRef.current = 0;
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    const startPolling = useCallback((batchId) => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }

        console.log('🔄 Starting polling for batch:', batchId);
        retryCountRef.current = 0;

        pollingIntervalRef.current = setInterval(async () => {
            if (!mountedRef.current) return;

            try {
                const response = await cardAPI.getBatchProgress(batchId);

                if (response?.success && response?.progress && mountedRef.current) {
                    const data = response.progress;
                    retryCountRef.current = 0; // Reset retry count on success

                    let eta = null;
                    if (startTimeRef.current && data.processed > 0 && data.processed < data.total) {
                        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
                        eta = calculateETA(data.processed, data.total, elapsedSeconds);
                    }

                    setProgress({
                        batchId: data.batchId,
                        status: data.status === 'completed' ? 'completed' :
                            data.status === 'error' ? 'error' : 'generating',
                        percentage: data.percentage || 0,
                        processed: data.processed || 0,
                        generated: data.generated || 0,
                        failed: data.failed || 0,
                        skipped: data.skipped || 0,
                        total: data.total || 0,
                        currentStudent: data.currentStudent || null,
                        failedStudents: data.failedStudents || [],
                        skippedStudents: data.skippedStudents || [],
                        message: data.message || `Processing ${data.processed || 0} of ${data.total || 0}...`,
                        eta: eta ? formatETA(eta) : null
                    });

                    // Stop polling when complete
                    if (data.status === 'completed' || data.status === 'error') {
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                    }
                } else if (response?.success === false) {
                    // Batch not found yet - increment retry count
                    retryCountRef.current++;

                    // Show waiting message after 3 retries (6 seconds)
                    if (retryCountRef.current === 3 && mountedRef.current) {
                        setProgress(prev => ({
                            ...prev,
                            message: 'Processing CSV upload... Please wait...',
                            status: 'waiting'
                        }));
                    }

                    // Don't give up until 30 retries (60 seconds)
                    if (retryCountRef.current > 30) {
                        console.log('⚠️ Polling timeout, stopping...');
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                            pollingIntervalRef.current = null;
                        }
                        if (mountedRef.current) {
                            setProgress(prev => ({
                                ...prev,
                                status: 'error',
                                message: 'Batch generation timed out. Please try again.'
                            }));
                        }
                    }
                }
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
    }, [calculateETA, formatETA]);

    const subscribeToBatch = useCallback((batchId) => {
        if (!batchId) {
            console.warn('No batchId provided');
            return;
        }

        console.log('📡 Subscribing to batch:', batchId);
        resetProgress();
        startTimeRef.current = Date.now();

        setProgress(prev => ({
            ...prev,
            batchId: batchId,
            status: 'starting',
            message: 'Initializing batch generation...'
        }));

        // Start polling with a small delay to let backend initialize
        setTimeout(() => {
            startPolling(batchId);
        }, 1000);
    }, [resetProgress, startPolling]);

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    return {
        progress,
        resetProgress,
        socketReady: true, // Always true for polling mode
        subscribeToBatch
    };
};

export default useBatchProgress;