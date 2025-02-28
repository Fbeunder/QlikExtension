# Changelog

All notable changes to the LiveTrainExtension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-02-28

### Fixed
- TypeError bug in animation settings configuration when using the `$scope.$parent.object.configureAnimationSettings` function
- Improved object reference handling in Angular scope to prevent errors during animation settings updates
- Added fallback mechanism to directly use trainVisualizer.configureAnimation when object reference is unavailable

## [1.0.0] - 2025-02-28

### Added
- Initial release of the LiveTrainExtension
- Real-time train tracking visualization on an interactive map
- Integration with NS-API for live train data
- Filtering based on Qlik Sense selections
- Ability to select trains directly from the map
- Dynamic updates with configurable refresh interval
- Train position animation with customizable settings
- Info popups with train details (number, position, delay, etc.)
- Color-coding of trains based on status (on time, delayed)
- Visual update indicator during data refreshes
- Complete support for Qlik Cloud environments
- Qlik theme integration (light/dark mode support)

### Security
- Improved XSS protection through proper HTML escaping
- API key management via separate file (not included in version control)
- Support for API key storage in Qlik variables for cloud environments

### Performance
- Set-based filtering for better performance with large datasets
- Memory leak prevention through improved event handler management
- Race condition prevention in asynchronous operations
- Efficient DOM manipulation via native DOM APIs
- Event delegation for improved performance

### Documentation
- Comprehensive README with installation and configuration instructions
- API key setup documentation
- Qlik Cloud compatibility guide
- External libraries bundling instructions
