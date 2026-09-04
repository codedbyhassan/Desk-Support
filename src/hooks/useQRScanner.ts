import { useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { useQRCode } from '@/context/QRCodeContext'
import { useToast } from './use-toast'

interface UseQRScannerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onScanSuccess?: (data: string) => void
  onScanError?: (error: string) => void
  continuous?: boolean
}

export function useQRScanner({
  videoRef,
  canvasRef,
  onScanSuccess,
  onScanError,
  continuous = true,
}: UseQRScannerOptions) {
  const { isScanning, stopScanning, setScannedData, setError } = useQRCode()
  const { toast } = useToast()
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const scanningRef = useRef(false)

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      console.log('[QR Scanner] Requesting camera access...')
      
      // Check if running in native app (no mediaDevices API)
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('[QR Scanner] getUserMedia not available - likely running in native app')
        setError('Running in native app - use native camera button instead')
        stopScanning()
        return
      }

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints as any)
      console.log('[QR Scanner] ✓ Camera stream obtained')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        scanningRef.current = true
        
        // Force video to play
        videoRef.current.play().catch((error) => {
          console.error('[QR Scanner] Play error:', error)
        })
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.name || 'Could not access camera'
      console.error('[QR Scanner] Camera error:', error)
      setError(errorMessage)
      onScanError?.(errorMessage)
      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
      })
      stopScanning()
    }
  }, [videoRef, setError, onScanError, toast, stopScanning])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    scanningRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [videoRef])

  // Scan QR code from video frame
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    try {
      // Check if video has data
      if (video.readyState < video.HAVE_CURRENT_DATA) {
        if (scanningRef.current) {
          animationFrameRef.current = requestAnimationFrame(scanFrame)
        }
        return
      }

      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      // Set canvas to video dimensions
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      // Draw video to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Try to get image data
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        
        // Decode QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code) {
          console.log('[QR Scanner] ✓ QR code found:', code.data)
          setScannedData(code.data)
          scanningRef.current = false
          onScanSuccess?.(code.data)
          return
        }
      } catch (error) {
        console.error('[QR Scanner] Canvas error:', error)
      }

      // Continue scanning
      if (scanningRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame)
      }
    } catch (error) {
      console.error('[QR Scanner] Frame scan error:', error)
      if (scanningRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame)
      }
    }
  }, [videoRef, canvasRef, setScannedData, onScanSuccess])

  // Start scanning when isScanning becomes true
  useEffect(() => {
    console.log('[QR Scanner] isScanning changed:', isScanning)
    if (isScanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isScanning, startCamera, stopCamera])

  // Start scanning loop when camera is ready
  useEffect(() => {
    if (isScanning && videoRef.current && canvasRef.current) {
      const video = videoRef.current
      let isMounted = true
      
      const startScanningLoop = () => {
        if (isMounted && scanningRef.current) {
          console.log('[QR Scanner] Starting scan loop...')
          scanFrame()
        }
      }

      // Try to start immediately if video is ready
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        console.log('[QR Scanner] Video already ready, starting scan immediately')
        setTimeout(startScanningLoop, 100)
      } else {
        // Wait for video to be ready
        const onLoadedMetadata = () => {
          console.log('[QR Scanner] Video loadedmetadata')
          if (isMounted) startScanningLoop()
        }
        const onCanPlay = () => {
          console.log('[QR Scanner] Video canplay')
          if (isMounted) startScanningLoop()
        }
        
        video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
        video.addEventListener('canplay', onCanPlay, { once: true })
        
        return () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('canplay', onCanPlay)
        }
      }

      return () => {
        isMounted = false
      }
    }
  }, [isScanning, videoRef, canvasRef, scanFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return {
    startCamera,
    stopCamera,
    scanFrame,
  }
}

