
# Retro Pong - Classic Arcade Game

A modern recreation of the classic Pong game built with React Native and Expo, featuring retro aesthetics and smooth 60 FPS gameplay.

## Features

- **Single Player Mode**: Play against AI with adjustable difficulty (Easy, Medium, Hard)
- **Local Multiplayer**: Two players on the same device
- **Retro Visual Effects**: 
  - Optional scanline overlay for authentic CRT feel
  - Pixelated font option
  - Ball trail effect
- **Smooth Gameplay**: 60 FPS animation using React Native Reanimated
- **Cross-Platform**: Works on iOS, Android, and Web
- **Responsive Controls**: 
  - Touch/swipe controls for mobile
  - Keyboard controls for desktop (Arrow keys for Player 1, W/S for Player 2)

## Game Rules

- First player to reach 11 points wins
- Ball speed increases with each paddle hit
- Ball angle changes based on where it hits the paddle
- Players and ball reset to center after each point

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run on specific platform
npm run ios
npm run android
npm run web
```

## Building for Production

### iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### Android

```bash
# Build APK
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android --profile production
```

## Deployment Checklist

✅ **App Configuration (app.json)**
- [x] Valid URL scheme: `retro-pong` (no spaces, lowercase with hyphens)
- [x] Bundle identifiers set for iOS and Android
- [x] App icon configured (1024x1024 PNG)
- [x] Splash screen configured
- [x] Version number set to 1.0.0

✅ **Build Configuration (eas.json)**
- [x] Production build profile configured
- [x] Auto-increment enabled for version codes
- [x] iOS Release build configuration
- [x] Android APK build type

✅ **Code Quality**
- [x] No backend dependencies (pure frontend game)
- [x] All routes properly registered
- [x] Error boundaries in place
- [x] Console logs for debugging user actions
- [x] Cross-platform compatibility (iOS, Android, Web)

✅ **Game Features**
- [x] Single player with AI
- [x] Local multiplayer
- [x] Pause/Resume functionality
- [x] Game reset
- [x] Score tracking
- [x] Win condition (first to 11)
- [x] Visual effects (scanlines, ball trail, pixelated font)

## Known Issues & Fixes

### Previous Build Error (RESOLVED)
**Error**: `The following URL schemes found in your app are not in the correct format: [Retro Pong]`

**Fix**: Changed URL scheme from `"Retro Pong"` to `"retro-pong"` in app.json. URL schemes must:
- Begin with an alphabetic character
- Contain only alphanumeric characters, periods, hyphens, or plus signs
- No spaces allowed

## Technical Stack

- **React Native**: 0.81.4
- **Expo**: ~54.0.1
- **React Native Reanimated**: ~4.1.0 (for smooth 60 FPS animations)
- **Expo Router**: ^6.0.0 (for navigation)
- **React Native Gesture Handler**: ^2.24.0 (for touch controls)

## Project Structure

```
app/
├── (tabs)/              # Tab navigation screens
│   ├── (home)/         # Home screen
│   └── profile.tsx     # Profile screen
├── pong-menu.tsx       # Game settings/menu
├── pong.tsx            # Main game screen
└── _layout.tsx         # Root layout with navigation

components/             # Reusable UI components
assets/                # Images, fonts, icons
```

## Controls

### Mobile
- **Single Player**: Swipe on left side to move your paddle
- **Multiplayer**: Swipe left side (Player 1) and right side (Player 2)

### Desktop
- **Single Player**: Arrow keys (↑ ↓) to move your paddle
- **Multiplayer**: Arrow keys (↑ ↓) for Player 1, W/S keys for Player 2

## License

MIT License - Feel free to use this project for learning or commercial purposes.

## Credits

Built with ❤️ using Expo and React Native
