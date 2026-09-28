const fs = require('fs');
const code = fs.readFileSync('src/components/MineTab.tsx', 'utf-8');
const search = `      // Cart Movement
      const targetRail = g.rails[cart.pathIndex];
      if (targetRail) {
          let cartSpeed = 0;
          if (distToCart > 400) {
              cartSpeed = 250; // Accelerate to catch up with player
          } else if (distToCart < 300) {
              cartSpeed = 80;  // Normal speed
          } else {
              cartSpeed = 150; // Transition speed
          }`;
const replace = `      // Cart Movement
      const targetRail = g.rails[cart.pathIndex];
      if (targetRail) {
          let cartSpeed = 0;
          if (distToCart < 300) {
              cartSpeed = 80; // Normal speed when near
          } else if (distToCart > 400 && p.y < cart.y - 100) {
              cartSpeed = 350; // Accelerate to catch up if player is way ahead
          } else if (distToCart >= 300 && distToCart <= 400 && p.y < cart.y - 50) {
              cartSpeed = 150; // Transition speed if player is ahead
          } else {
              cartSpeed = 0; // Stop if player is far behind or too far away not in front
          }`;
const newCode = code.replace(search, replace);
fs.writeFileSync('src/components/MineTab.tsx', newCode);
