# External Libraries Bundling Instructions

## Overview

This document provides instructions for bundling external libraries with the LiveTrainExtension for Qlik Sense. When deploying to Qlik Cloud, all external libraries must be bundled with the extension to comply with Content Security Policy (CSP) restrictions.

## Required External Libraries

The LiveTrainExtension relies on the following external libraries:

1. **Leaflet** - For map rendering and interactive map features
2. **jQuery** - Used for DOM manipulation and event handling
3. **Promise Polyfill** - For Promise support in older browsers

## Bundling Methods

### Method 1: Manual Inclusion (Recommended for Development)

1. Download the required library files:
   - Leaflet: https://leafletjs.com/download.html
   - jQuery: https://jquery.com/download/
   - Promise Polyfill: https://github.com/taylorhakes/promise-polyfill

2. Place the files in the `lib/js/` directory:
   ```
   LiveTrainExtension/
   └── lib/
       ├── css/
       │   ├── style.css
       │   └── leaflet.css       # Add Leaflet CSS here
       └── js/
           ├── qlik-style.js
           ├── leaflet.js        # Add Leaflet JS here
           ├── jquery.min.js     # Add jQuery here
           └── promise.min.js    # Add Promise polyfill here
   ```

3. Update the references in your HTML template within `LiveTrainExtension.js`:

   ```javascript
   // Example of loading bundled libraries
   $element.html(`
     <link rel="stylesheet" href="../resources/lib/css/leaflet.css">
     <script src="../resources/lib/js/leaflet.js"></script>
     <script src="../resources/lib/js/jquery.min.js"></script>
     <script src="../resources/lib/js/promise.min.js"></script>
     <div id="map-container" class="map-container"></div>
   `);
   ```

### Method 2: Using a Build System (Recommended for Production)

For production deployments, we recommend using a build system like Webpack to bundle all dependencies:

1. Install Node.js and npm if not already installed

2. Initialize npm in your project:
   ```bash
   npm init -y
   ```

3. Install required dependencies and webpack:
   ```bash
   npm install --save leaflet jquery promise-polyfill
   npm install --save-dev webpack webpack-cli css-loader style-loader file-loader
   ```

4. Create a webpack.config.js file:
   ```javascript
   const path = require('path');

   module.exports = {
     entry: './src/index.js',
     output: {
       filename: 'bundle.js',
       path: path.resolve(__dirname, 'dist'),
     },
     module: {
       rules: [
         {
           test: /\.css$/,
           use: ['style-loader', 'css-loader'],
         },
         {
           test: /\.(png|svg|jpg|gif)$/,
           use: ['file-loader'],
         },
       ],
     },
   };
   ```

5. Create an index.js file in a src directory to import all dependencies:
   ```javascript
   import 'leaflet/dist/leaflet.css';
   import L from 'leaflet';
   import $ from 'jquery';
   import 'promise-polyfill/src/polyfill';

   // Make them available globally if needed
   window.L = L;
   window.jQuery = window.$ = $;
   ```

6. Add a build script to your package.json:
   ```json
   "scripts": {
     "build": "webpack --mode production"
   }
   ```

7. Run the build:
   ```bash
   npm run build
   ```

8. Include the generated bundle.js in your extension:
   ```javascript
   $element.html(`
     <script src="../resources/dist/bundle.js"></script>
     <div id="map-container" class="map-container"></div>
   `);
   ```

## Qlik Cloud Considerations

When deploying to Qlik Cloud, be aware of the following:

1. **Content Security Policy (CSP)** - Qlik Cloud has a strict CSP that prevents loading resources from external domains. All resources must be bundled with the extension.

2. **Size Limitations** - Extensions have size limitations. Minimize your bundle size by:
   - Using minified versions of libraries
   - Removing unused features
   - Considering lighter alternatives where possible

3. **CORS Issues** - External API calls may face CORS restrictions. Consider using:
   - Qlik's built-in proxy capabilities
   - Server-side proxies
   - APIs that support CORS

4. **Version Compatibility** - Ensure all libraries are compatible with the Qlik Cloud environment:
   - Test thoroughly before deployment
   - Check for known issues in the Qlik Community forums

## Updating Bundled Libraries

When updating bundled libraries:

1. Test thoroughly in a development environment
2. Check for API changes that might affect your code
3. Update any references to specific API versions in your code
4. Regenerate the bundle if using a build system
5. Test again in a production-like environment before deploying

## Troubleshooting

If you encounter issues with bundled libraries:

1. **Console Errors** - Check the browser console for specific error messages
2. **Network Tab** - Verify all resources are loading correctly
3. **CSP Violations** - Look for Content Security Policy violation warnings
4. **Library Conflicts** - Ensure libraries aren't conflicting with each other or with Qlik's built-in libraries
5. **Path Issues** - Confirm paths to bundled resources are correct relative to the extension

## Additional Resources

- [Qlik Sense Developer Documentation](https://help.qlik.com/en-US/sense-developer/home.html)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [jQuery Documentation](https://api.jquery.com/)
- [Webpack Documentation](https://webpack.js.org/concepts/)
