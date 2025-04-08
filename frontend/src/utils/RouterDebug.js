import React from 'react';

/**
 * Helper component to detect Router nesting issues
 * Add this to components where you suspect Router nesting problems
 */
export const RouterDebug = () => {
  console.log('Component tree path:', 
    React.useDebugValue && React.useDebugValue('Component rendering'));
  
  return null; // This component doesn't render anything
};

export default RouterDebug;
