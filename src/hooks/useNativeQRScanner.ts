import { useCallback, useRef } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import jsQR from 'jsqr'
import { useQRCode } from '@/context/QRCodeContext'
import { useToast } from './use-toast'

interface UseNativeQRScannerOptions {
  onSuccess?: (data: string) => void
}

export function useNativeQRScanner({ onSuccess }: UseNativeQRScannerOptions = {}) {
  const { setScannedData, stopScanning } = useQRCode()
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const scanQRCode = useCallback(async () => {
    try {
      console.log('[Native QR Scanner] Opening camera...')

      // Open camera and get photo
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })

      if (!image.dataUrl) {
        toast({
          title: 'Error',
          description: 'No image captured',
          variant: 'destructive',
        })
        return
      }

      console.log('[Native QR Scanner] Image captured, decoding...')
      toast({
        title: 'Processing...',
        description: 'Scanning QR code...',
      })

      // Convert data URL to image and scan
      const canvas = canvasRef.current
      if (!canvas) {
        throw new Error('Canvas not available')
      }

      const img = new Image()
      img.onload = () => {
        try {
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas context not available')

          canvas.width = img.width
          canvas.height = img.height
          context.drawImage(img, 0, 0)

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })

          if (code) {
            console.log('[Native QR Scanner] ✓ QR code found:', code.data)
            setScannedData(code.data)
            toast({
              title: '✓ QR Code Detected',
              description: 'Processing your attendance...',
            })
            onSuccess?.(code.data)
          } else {
            console.log('[Native QR Scanner] No QR code found')
            toast({
              title: 'No QR Code',
              description: 'Could not detect QR code in photo. Try again.',
              variant: 'destructive',
            })
          }
        } catch (error) {
          console.error('[Native QR Scanner] Error processing image:', error)
          toast({
            title: 'Error',
            description: 'Failed to process image',
            variant: 'destructive',
          })
        }
      }
      img.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to load image',
          variant: 'destructive',
        })
      }
      img.src = image.dataUrl
    } catch (error: any) {
      const errorMessage = error?.message || 'Camera error'
      console.error('[Native QR Scanner] Error:', error)
      
      // Don't show error if user cancelled
      if (errorMessage?.includes('User cancelled') || errorMessage?.includes('cancel')) {
        console.log('[Native QR Scanner] User cancelled camera')
        return
      }

      toast({
        title: 'Camera Error',
        description: errorMessage,
        variant: 'destructive',
      })
      stopScanning()
    }
  }, [setScannedData, stopScanning, toast, onSuccess])

  return {
    scanQRCode,
    canvasRef,
  }
}
