/**
 * This utility helps verify and fix common Router problems
 */

export const checkRouterComponents = () => {
  let hints = [];
  
  // Check for Router import patterns
  try {
    if (document.querySelector("[data-reactroot]")) {
      console.log("✅ React is properly mounted");
    }
    
    // Log navigation objects availability
    console.log("Navigation API availability check:");
    const navigation = window.navigation;
    console.log(`Navigation API: ${navigation ? "Available" : "Not available"}`);
    
    console.log("React Router diagnostic information:");
    console.log("- If you're still having Router issues, check for:");
    console.log("  1. Any components importing BrowserRouter or Router directly");
    console.log("  2. Components trying to use useNavigate outside Router context");
    console.log("  3. Custom route components that might wrap with BrowserRouter");
    
    hints.push("Remember to use navigation hooks only within components inside the Router context");
    hints.push("Check all imports for 'BrowserRouter', 'HashRouter', or 'Router' strings");
    hints.push("Only have one Router in index.js, remove any from App.js");
  } catch (error) {
    console.error("Error during router diagnostics:", error);
  }
  
  return hints;
};

// Immediately invoke to display help in console
checkRouterComponents();

export default checkRouterComponents;
