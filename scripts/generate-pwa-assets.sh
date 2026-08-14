#!/usr/bin/env bash
#
# scripts/generate-pwa-assets.sh
#
# Generates PNG icons for the PWA manifest and iOS / web app shortcuts.
#

set -euo pipefail

# 1. Dependency checks
if ! command -v rsvg-convert >/dev/null 2>&1; then
    echo "Error: rsvg-convert is not installed. Please run 'brew install librsvg' first." >&2
    exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SVG="${ROOT_DIR}/src/lib/assets/favicon.svg"

if [ ! -f "${SOURCE_SVG}" ]; then
    echo "Error: Source SVG not found at ${SOURCE_SVG}" >&2
    exit 1
fi

STATIC_DIR="${ROOT_DIR}/static"
STATIC_ICONS_DIR="${STATIC_DIR}/icons"
PUBLIC_ICONS_DIR="${ROOT_DIR}/public/icons"

# Ensure output directories exist
mkdir -p "${STATIC_DIR}" "${STATIC_ICONS_DIR}" "${PUBLIC_ICONS_DIR}"

# Copy primary SVG icon to static targets
cp "${SOURCE_SVG}" "${STATIC_DIR}/favicon.svg"
cp "${SOURCE_SVG}" "${STATIC_ICONS_DIR}/favicon.svg"
cp "${SOURCE_SVG}" "${PUBLIC_ICONS_DIR}/favicon.svg"

# Generate maskable SVG icon from standard SVG icon
echo "Generating maskable SVG from standard SVG..."
bash "${ROOT_DIR}/scripts/generate-maskable-svg.sh"

MASKABLE_SVG="${STATIC_DIR}/favicon-maskable.svg"

# Generate PNG icons
echo "Generating PNG icons..."

# Helper function to generate PNGs into all target directories
generate_png() {
    local width="$1"
    local height="$2"
    local input_svg="$3"
    local filename="$4"

    rsvg-convert -w "${width}" -h "${height}" -f png -o "${STATIC_DIR}/${filename}" "${input_svg}"
    cp "${STATIC_DIR}/${filename}" "${STATIC_ICONS_DIR}/${filename}"
    cp "${STATIC_DIR}/${filename}" "${PUBLIC_ICONS_DIR}/${filename}"
    echo "  Generated ${filename} (${width}x${height})"
}

# 1. Standard / iOS Icon Shape PNGs (from favicon.svg)
generate_png 192 192 "${SOURCE_SVG}" "pwa-icon-192x192.png"
generate_png 512 512 "${SOURCE_SVG}" "pwa-icon-512x512.png"
generate_png 180 180 "${SOURCE_SVG}" "apple-touch-icon.png"
generate_png 64 64 "${SOURCE_SVG}" "favicon.png"

# 2. Maskable PNGs (from favicon-maskable.svg)
generate_png 192 192 "${MASKABLE_SVG}" "pwa-icon-maskable-192x192.png"
generate_png 512 512 "${MASKABLE_SVG}" "pwa-icon-maskable-512x512.png"

echo "PNG icons generated successfully."
