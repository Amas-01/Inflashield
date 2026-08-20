/**
 * Test page - Simple version to diagnose issues
 */

'use client'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-deep flex items-center justify-center p-8">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-white mb-4">
          ✅ UI Transformation Loaded Successfully!
        </h1>
        
        <div className="space-y-4 text-text-secondary">
          <p className="text-lg">
            If you can see this page, the dark theme and fonts are working.
          </p>
          
          <div className="glass rounded-xl p-6">
            <h2 className="text-xl text-gold-500 font-semibold mb-2">
              Design System Check
            </h2>
            <ul className="space-y-2 text-sm">
              <li>✓ Dark background (#080F1C)</li>
              <li>✓ Glass morphism effect</li>
              <li>✓ Gold accent colors</li>
              <li>✓ Typography system</li>
            </ul>
          </div>
          
          <div className="glass-gold rounded-xl p-6">
            <h2 className="text-xl text-white font-semibold mb-2">
              Next Steps
            </h2>
            <p className="text-sm">
              Visit <a href="/" className="text-gold-400 hover:text-gold-300 underline">the homepage</a> to see the full UI with:
            </p>
            <ul className="space-y-1 text-sm mt-2">
              <li>• 3D animated globe</li>
              <li>• Smooth scrolling</li>
              <li>• Custom cursor</li>
              <li>• All sections</li>
            </ul>
          </div>
          
          <div className="flex gap-4">
            <a
              href="/"
              className="bg-gold-500 text-black px-6 py-3 rounded-xl font-semibold hover:bg-gold-400 transition-colors"
            >
              Go to Homepage
            </a>
            <button
              onClick={() => window.location.reload()}
              className="border border-border text-text-secondary px-6 py-3 rounded-xl hover:border-gold-500 transition-colors"
            >
              Reload Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
