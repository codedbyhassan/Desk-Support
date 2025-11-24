import { useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { useQRCode } from '@/context/QRCodeContext'
import { useToast } from './use-toast'

interface UseQRScannerOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        scanningRef.current = true
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Could not access camera'
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
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (continuous && scanningRef.current && isScanning) {
        animationFrameRef.current = requestAnimationFrame(scanFrame)
      }
      return
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Decode QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code) {
      const qrData = code.data
      setScannedData(qrData)
      // Stop scanning immediately when QR code is detected
      scanningRef.current = false
      onScanSuccess?.(qrData)
      
      if (!continuous) {
        stopCamera()
        stopScanning()
      }
    } else if (continuous && scanningRef.current && isScanning) {
      // Continue scanning only if still scanning
      animationFrameRef.current = requestAnimationFrame(scanFrame)
    }
  }, [videoRef, canvasRef, continuous, isScanning, setScannedData, onScanSuccess, stopCamera, stopScanning])

  // Start scanning when isScanning becomes true
  useEffect(() => {
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
      
      const handleLoadedMetadata = () => {
        if (scanningRef.current) {
          scanFrame()
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      
      // Start scanning immediately if video is already loaded
      if (video.readyState >= video.HAVE_METADATA) {
        scanFrame()
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
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

