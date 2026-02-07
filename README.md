# VAST Test Harness - Next.js

A comprehensive VAST tag testing and validation tool built with Next.js, featuring Bunny.net video streaming integration and Google IMA SDK support.

## Features

- **VAST Generator**: Create compliant VAST 4.0 tags for Bunny.net video streaming
- **VAST Validator**: Comprehensive validation of VAST XML structure and compliance
- **Video Player**: Test VAST tags with Google IMA SDK integration
- **Event Tracking**: Real-time event logging and debugging
- **Dual Input Modes**: Support for both VAST URLs and direct XML input
- **Share Links**: Generate shareable test URLs

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

```bash
npm run build
npm start
```

## Usage

### 1. Generate VAST for Bunny.net

1. Enter your Bunny.net video URL (e.g., `https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID`)
2. Set ad title and duration
3. Click "Generate VAST"
4. Generated VAST XML appears in the textarea

### 2. Validate VAST

- Click "Validate VAST" to check XML compliance
- View detailed validation results with errors and warnings
- Ensures VAST 4.0 specification compliance

### 3. Test VAST

1. Click "Load & Test" to load generated VAST into player
2. Or switch to VAST URL/XML mode and enter your own tag
3. Click "Play Ad" to test with Google IMA SDK
4. Monitor events in real-time debug log

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **Ad SDK**: Google IMA HTML5 SDK
- **Video Platform**: Bunny.net Stream

## Project Structure

```
vast-test-harness/
├── app/
│   ├── layout.tsx       # Root layout with IMA SDK
│   ├── page.tsx         # Main VAST test harness component
│   └── globals.css      # Global styles
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Features in Detail

### VAST Generator
- Parses Bunny.net video URLs automatically
- Generates VAST 4.0 compliant XML
- Includes tracking events (quartiles, player state, etc.)
- Supports ViewableImpression and UniversalAdId

### VAST Validator
- XML structure validation
- Required element checking
- MediaFile validation
- Duration format verification
- URL format validation
- Comprehensive error reporting

### Video Player
- Google IMA SDK integration
- Responsive 16:9 aspect ratio
- Event tracking and logging
- Support for various media formats
- Share link generation

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
