import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import './portfolio_demo_notice.css'
import App from '../App.tsx'
import { PortfolioDemoNotice } from './PortfolioDemoNotice'
import { seedPortfolioDemoChronicleWhenAbsent } from './portfolio_demo_session'

seedPortfolioDemoChronicleWhenAbsent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PortfolioDemoNotice />
  </StrictMode>,
)
