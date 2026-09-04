import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface QRCodeContextType { isScanning:boolean; scannedData:string|null; error:string|null; startScanning:()=>void; stopScanning:()=>void; setScannedData:(data:string|null)=>void; setError:(error:string|null)=>void }
const QRCodeContext=createContext<QRCodeContextType|undefined>(undefined)
export function QRCodeProvider({children}:{children:ReactNode}){
 const [isScanning,setIsScanning]=useState(false); const [scannedData,setScannedData]=useState<string|null>(null); const [error,setError]=useState<string|null>(null)
 const startScanning=useCallback(()=>{setError(null);setScannedData(null);setIsScanning(true)},[])
 const stopScanning=useCallback(()=>{setIsScanning(false);setScannedData(null);setError(null)},[])
 return <QRCodeContext.Provider value={{isScanning,scannedData,error,startScanning,stopScanning,setScannedData,setError}}>{children}</QRCodeContext.Provider>
}
export function useQRCode(){const value=useContext(QRCodeContext);if(!value)throw new Error('useQRCode must be used within QRCodeProvider');return value}
