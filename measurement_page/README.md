# Kiosk Measurement Display

This project displays user measurements and visualizes the fit (Tight, Perfect, Loose) on a body heatmap.

## Files
- `index.html`: Main structure and SVG body map.
- `style.css`: Dark theme styles matching the Kiosk design.
- `script.js`: Logic to compare body measurements vs garment dimensions and colorize the heatmap.

## Customization
To update the measurements or garment sizes, edit the `mockData` object in `script.js`.

```javascript
const mockData = {
    measurements: { ... },
    garmentDimensions: { ... }
};
```

You can integrate this with an API by fetching the data in the `init()` function in `script.js`.
