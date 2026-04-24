import { describe, it, expect } from 'vitest';
import { sanitizePath, isAllowedPath } from '../src/storage/paths';

describe('sanitizePath', () => {
  it('strips leading slashes', () => {
    expect(sanitizePath('/index.html')).toBe('index.html');
  });
  it('rejects parent references', () => {
    expect(sanitizePath('../secret.html')).toBeNull();
    expect(sanitizePath('foo/../bar.html')).toBeNull();
  });
  it('flattens nested paths to basename', () => {
    expect(sanitizePath('pages/about.html')).toBe('about.html');
  });
  it('trims whitespace', () => {
    expect(sanitizePath('  index.html  ')).toBe('index.html');
  });
  it('returns null for empty input', () => {
    expect(sanitizePath('')).toBeNull();
    expect(sanitizePath('   ')).toBeNull();
  });
});

describe('isAllowedPath', () => {
  it.each([
    ['index.html', true],
    ['styles.css', true],
    ['script.js', true],
    ['logo.svg', true],
    ['data.json', true],
    ['notes.md', true],
    ['readme.txt', true],
    ['hack.php', false],
    // User-uploaded image assets are now allowed — asset-uploads feature.
    ['photo.jpg', true],
    ['photo.png', true],
    ['photo.gif', true],
    ['photo.webp', true],
    ['icon.ico', true],
    ['photo.jpeg', true],
    ['photo.avif', true],
    ['no-ext', false],
  ])('%s -> %s', (path, expected) => {
    expect(isAllowedPath(path)).toBe(expected);
  });
});
