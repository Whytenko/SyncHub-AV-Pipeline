import React from 'react'
import Sidebar from './Sidebar'
import './AppLayout.css'

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">{children}</div>
    </div>
  )
}

export default AppLayout
