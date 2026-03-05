import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, LayoutDashboard, Sparkles } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const Navbar = ({ darkMode, toggleTheme }) => {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/features', label: 'Features', icon: Sparkles },
  ]

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-white dark:bg-gray-800 shadow-lg border-b-2 border-primary-100 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300 overflow-visible"
    >
      <div className="container mx-auto px-4 max-w-7xl overflow-visible">
        <div className="flex items-center justify-between h-20 overflow-visible">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3 group overflow-visible">
            <div className="p-8 overflow-visible flex items-center justify-center">
              <Logo className="w-12 h-12" />
            </div>
            <div className="flex flex-col">
              <motion.h1
                className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
              >
                NutriVision AI
              </motion.h1>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Smart Nutritional Analysis</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link key={item.path} to={item.path}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex items-center space-x-2 px-6 py-3 rounded-xl font-medium
                      transition-all duration-300
                      ${isActive 
                        ? 'bg-primary-500 text-white shadow-lg' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden md:inline">{item.label}</span>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar
