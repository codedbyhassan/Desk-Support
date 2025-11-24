import { createContext, useContext, useState, ReactNode } from 'react'

interface QRCodeContextType {
  isScanning: boolean
  scannedData: string | null
  error: string | null
  startScanning: () => void
  stopScanning: () => void
  setScannedData: (data: string | null) => void
  setError: (error: string | null) => void
}

const QRCodeContext = createContext<QRCodeContextType | undefined>(undefined)

export function QRCodeProvider({ children }: { children: ReactNode }) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startScanning = () => {
    setIsScanning(true)
    setScannedData(null)
    setError(null)
  }

  const stopScanning = () => {
    setIsScanning(false)
    setScannedData(null)
    setError(null)
  }

  return (
    <QRCodeContext.Provider
      value={{
        isScanning,
        scannedData,
        error,
        startScanning,
        stopScanning,
        setScannedData,
        setError,
      }}
    >
      {children}
    </QRCodeContext.Provider>
  )
}

export function useQRCode() {
  const context = useContext(QRCodeContext)
  if (context === undefined) {
    throw new Error('useQRCode must be used within a QRCodeProvider')
  }
  return context
}

