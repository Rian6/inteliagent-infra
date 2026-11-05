import React from 'react';
// Render the decorative SVG as browser SVG in the native UI preview.
// Metro uses react-native-svg on the device.
export const Defs = props => <defs {...props}/>;
export const Pattern = props => <pattern {...props}/>;
export const Circle = props => <circle {...props}/>;
export const Path = props => <path {...props}/>;
export const Rect = props => <rect {...props}/>;
export default function Svg(props) { return <svg {...props}/>; }
