/**
 * Build script for LiveTrainExtension
 * 
 * This script generates a production-ready ZIP package for the LiveTrainExtension
 * which can be imported directly into Qlik Sense.
 * 
 * Usage:
 *   - Run with: npm run build
 *   - The output will be created in the ./dist folder
 */

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const packageJson = require('./package.json');

// Configuration
const config = {
  // Source directory for the extension
  sourceDir: 'LiveTrainExtension',
  
  // Source files & directories to include (relative to the source directory)
  include: [
    'LiveTrainExtension.js',
    'LiveTrainExtension.qext',
    'initialProperties.js',
    'propertyPanel.js',
    'api/trainDataService.js',
    'api/apiConfig.js',
    'api/apiKey.template.js',
    'ui/mapRenderer.js',
    'ui/trainVisualizer.js',
    'lib/css/style.css',
    'lib/js/qlik-style.js',
    'README.md',
    'QLIK_CLOUD_COMPATIBILITY.md',
    'EXTERNAL_LIBRARIES.md',
    'CHANGELOG.md'
  ],
  
  // Files & patterns to exclude
  exclude: [
    'api/apiKey.js',
    '.git',
    '.gitignore',
    'node_modules',
    'build.js',
    'package.json',
    'package-lock.json',
    'claude.me',
    'develop_context.md'
  ],
  
  // External libraries to bundle
  externalLibraries: [
    // Leaflet library files would be copied from node_modules
    {
      source: 'node_modules/leaflet/dist',
      destination: 'lib/external/leaflet'
    }
  ],
  
  // Output configuration
  output: {
    dir: 'dist',
    filename: `LiveTrainExtension-v${packageJson.version}.zip`
  }
};

// Ensure version consistency
async function updateVersionInfo() {
  console.log('Updating version information...');
  
  // Read the qext file
  const qextPath = path.join(config.sourceDir, 'LiveTrainExtension.qext');
  let qextContent = await fs.readJson(qextPath);
  
  // Update version to match package.json
  qextContent.version = packageJson.version;
  
  // Write updated qext file
  await fs.writeJson(qextPath, qextContent, { spaces: 2 });
  console.log(`Updated ${qextPath} with version ${packageJson.version}`);
}

// Create build directory structure
async function createBuildStructure() {
  console.log('Creating build directory structure...');
  
  const buildDir = path.join(config.output.dir, 'build');
  
  // Clean previous build
  await fs.emptyDir(buildDir);
  
  // Create necessary directories
  for (const file of config.include) {
    const sourcePath = path.join(config.sourceDir, file);
    const targetPath = path.join(buildDir, file);
    
    console.log(`Processing: ${sourcePath} -> ${targetPath}`);
    
    if (await fs.pathExists(sourcePath)) {
      const stats = await fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        await fs.ensureDir(targetPath);
        await fs.copy(sourcePath, targetPath);
        console.log(`Copied directory: ${sourcePath} -> ${targetPath}`);
      } else {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
        console.log(`Copied file: ${sourcePath} -> ${targetPath}`);
      }
    } else {
      console.warn(`Warning: File not found: ${sourcePath}`);
    }
  }
  
  // Copy external libraries
  for (const lib of config.externalLibraries) {
    const sourcePath = path.resolve(lib.source);
    const targetPath = path.join(buildDir, lib.destination);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.ensureDir(targetPath);
      await fs.copy(sourcePath, targetPath);
      console.log(`Copied external library: ${lib.source} → ${lib.destination}`);
    } else {
      console.warn(`Warning: External library not found: ${sourcePath}`);
      console.warn('Did you run "npm install" first?');
    }
  }
  
  // Copy root files that should be in the root of the extension
  // This is a fallback mechanism to ensure backward compatibility
  const requiredRootFiles = [
    { src: path.join(config.sourceDir, 'LiveTrainExtension.qext'), 
      dest: path.join(buildDir, 'LiveTrainExtension.qext') }
  ];
  
  for (const file of requiredRootFiles) {
    if (await fs.pathExists(file.src)) {
      await fs.copy(file.src, file.dest);
      console.log(`Copied root file: ${file.src} → ${file.dest}`);
    }
  }
  
  return buildDir;
}

// Create the ZIP archive
async function createZipArchive(sourceDir) {
  console.log('Creating ZIP archive...');
  
  // Ensure output directory exists
  await fs.ensureDir(config.output.dir);
  
  const outputPath = path.join(config.output.dir, config.output.filename);
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Listen for archive events
  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`Archive created: ${outputPath} (${sizeInMB} MB)`);
  });
  
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add the entire build directory to the archive
  archive.directory(sourceDir, false);
  
  // Finalize the archive
  await archive.finalize();
}

// Main build function
async function build() {
  console.log(`Building LiveTrainExtension v${packageJson.version}...`);
  
  try {
    // Update version information
    await updateVersionInfo();
    
    // Create build structure
    const buildDir = await createBuildStructure();
    
    // Create ZIP archive
    await createZipArchive(buildDir);
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();