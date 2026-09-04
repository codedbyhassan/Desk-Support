import * as ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/auth.css'

const root=document.getElementById('root')
if(!root)throw new Error('Desk-Support root element was not found.')

ReactDOM.createRoot(root).render(<App />)
