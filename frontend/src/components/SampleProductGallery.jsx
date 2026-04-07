import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Info } from 'lucide-react'

// Product metadata - names, categories, NOVA classification
const PRODUCT_INFO = [
  { name: 'Doritos Nacho Cheese', category: 'Snacks', nova: 4 },
  { name: 'Coca Cola', category: 'Beverages', nova: 4 },
  { name: 'Perdue Chicken Breast', category: 'Meat', nova: 1 },
  { name: 'Maruchan Ramen', category: 'Instant Food', nova: 4 },
  { name: 'Barley', category: 'Grains', nova: 1 },
  { name: 'Fischers Honey', category: 'Sweeteners', nova: 2 },
  { name: 'Great Value Whole Milk', category: 'Dairy', nova: 1 },
  { name: 'Heinz Ketchup', category: 'Condiments', nova: 3 },
  { name: 'Lakewood Orange Juice', category: 'Beverages', nova: 3 },
  { name: 'Turkey Hill Ice Cream', category: 'Frozen', nova: 4 },
  { name: 'Velveeta Cheese Slices', category: 'Dairy', nova: 4 },
  { name: 'Great Value Sweet Peas', category: 'Vegetables', nova: 2 },
]

// Product filenames for the 12 image pairs
const PRODUCT_FILENAMES = [
  '1-Doritos-Nacho-Cheese-Tortilla-Snack-Chips-Party-Size-14-5-Ounce-Bag.avif',
  '2-Coca Cola.webp',
  '3-Perdue-No-Antibiotics-Ever-Fresh-Chicken-Breast-Tenderloins-1-2-lb-Tray.avif',
  '4-Maruchan-Ramen-Noodle-Creamy-Chicken-Flavor-Soup-3-oz-Shelf-Stable-Package.avif',
  '5-Barley.webp',
  '6-Fischers-Honey-24oz-Raw-and-Unfiltered-Local-100-US-Grade-A-Squeeze-Bottle.avif',
  '7-Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic.avif',
  '8-Heinz-Tomato-Ketchup-20-oz-Bottle.avif',
  '9-Lakewood-Organic-Pure-Orange-Juice-32-fl-oz-Pack-of-2.avif',
  '10-Turkey-Hill-Moose-Tracks-Premium-Ice-Cream-46-fl-oz.avif',
  '11-Velveeta-Slices-Original-Cheese-24-Ct-Pk.avif',
  '12-Great-Value-Frozen-Sweet-Peas-12-oz-Steamable-Bag.avif',
]

// Generate sample products array from the metadata
const SAMPLE_PRODUCTS = PRODUCT_INFO.map((info, index) => ({
  id: index + 1,
  name: info.name,
  category: info.category,
  estimatedNova: info.nova,
  // Product images have full names
  productImage: `${import.meta.env.BASE_URL}labels/product/${PRODUCT_FILENAMES[index]}`,
  // Label images are just numbered
  labelImage: `${import.meta.env.BASE_URL}labels/label/${index + 1}.webp`,
}))

const NOVA_COLORS = {
  1: 'bg-emerald-500',
  2: 'bg-blue-500',
  3: 'bg-amber-500',
  4: 'bg-red-500',
}

function SampleProductGallery({ onSelectProduct }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [showLabelModal, setShowLabelModal] = useState(null)
  const [modalShowingLabel, setModalShowingLabel] = useState(false)

  const categories = ['All', ...new Set(SAMPLE_PRODUCTS.map(p => p.category))]

 const filteredProducts = SAMPLE_PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleProductClick = (product) => {
    // Show full label modal when clicked, starting with product image
    setShowLabelModal(product)
    setModalShowingLabel(false)
    // Automatically flip to label after 1 second
    setTimeout(() => {
      setModalShowingLabel(true)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Try a Sample Product
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Select a product to see animated view. Hover over product images to preview nutrition labels.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredProducts.map(product => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            className="relative group cursor-pointer"
            onMouseEnter={() => setHoveredProduct(product.id)}
            onMouseLeave={() => setHoveredProduct(null)}
            onClick={() => handleProductClick(product)}
          >
            <div className="card p-3 h-full flex flex-col items-center space-y-2 hover:shadow-lg transition-shadow">
              {/* Product/Label Image Container */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                {/* Label image (back) - shows on hover */}
                <div 
                  className="absolute inset-0 w-full h-full transition-opacity duration-300"
                  style={{ 
                    opacity: hoveredProduct === product.id ? 1 : 0,
                    zIndex: hoveredProduct === product.id ? 2 : 1
                  }}
                >
                  <img
                    src={product.labelImage}
                    alt={`${product.name} nutrition label`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Label%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
                
                {/* Product image (front) - shows by default */}
                <div 
                  className="absolute inset-0 w-full h-full transition-opacity duration-300"
                  style={{ 
                    opacity: hoveredProduct === product.id ? 0 : 1,
                    zIndex: hoveredProduct === product.id ? 1 : 2
                  }}
                >
                  <img
                    src={product.productImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
                
                {/* NOVA Badge */}
                <div className={`absolute top-2 right-2 ${NOVA_COLORS[product.estimatedNova]} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10`}>
                  {product.estimatedNova}
                </div>

                {/* Hover indicator */}
                {hoveredProduct === product.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs py-1 px-2 rounded text-center z-10"
                  >
                    <Info className="w-3 h-3 inline mr-1" />
                    Click to view full size
                  </motion.div>
                )}
              </div>

              {/* Product Info */}
              <div className="text-center space-y-1 w-full">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                  {product.name}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {product.category}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No results */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No products found matching your criteria.</p>
        </div>
      )}

      {/* Modal with Flip Animation */}
      <AnimatePresence>
        {showLabelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowLabelModal(null)
              setModalShowingLabel(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: '1000px' }}
            >
              {/* Close button */}
              <button
                onClick={() => {
                  setShowLabelModal(null)
                  setModalShowingLabel(false)
                }}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Toggle button */}
              <button
                onClick={() => setModalShowingLabel(!modalShowingLabel)}
                className="absolute top-4 left-4 z-20 px-3 py-2 rounded-lg bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-all text-sm font-medium"
              >
                {modalShowingLabel ? '← Show Product' : 'Show Label →'}
              </button>

              {/* Image Container with Flip Animation */}
              <div className="relative overflow-hidden rounded-xl" style={{ transformStyle: 'preserve-3d' }}>
                <AnimatePresence mode="wait">
                  {modalShowingLabel ? (
                    <motion.div
                      key="label"
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                      className="overflow-auto max-h-[90vh]"
                    >
                      <img
                        src={showLabelModal.labelImage}
                        alt={`${showLabelModal.name} nutrition label`}
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ELabel Not Available%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="product"
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: -90 }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                      className="overflow-auto max-h-[90vh]"
                    >
                      <img
                        src={showLabelModal.productImage}
                        alt={showLabelModal.name}
                        className="w-full h-auto"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EProduct Not Available%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Product info footer */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 pointer-events-none">
                <p className="text-white font-semibold">{showLabelModal.name}</p>
                <p className="text-gray-300 text-sm">
                  {showLabelModal.category} • {modalShowingLabel ? 'Nutrition Label' : 'Product Image'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SampleProductGallery
