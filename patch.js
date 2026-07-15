const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/App.tsx');
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/setState\(\(current\) => \{\s*if \(JSON\.stringify\(current\) === JSON\.stringify\(parsed\)\) return current;\s*isExternalUpdateRef\.current = true;\s*return parsed;\s*\}\);/g, `
          isExternalUpdateRef.current = true;
          setState((current) => {
            if (JSON.stringify(current) === JSON.stringify(parsed)) {
              isExternalUpdateRef.current = false;
              return current;
            }
            return parsed;
          });
`);

code = code.replace(/setState\(\(current\) => \{\s*if \(JSON\.stringify\(current\) === JSON\.stringify\(event\.data\)\) return current;\s*isExternalUpdateRef\.current = true;\s*return event\.data;\s*\}\);/g, `
        isExternalUpdateRef.current = true;
        setState((current) => {
          if (JSON.stringify(current) === JSON.stringify(event.data)) {
            isExternalUpdateRef.current = false;
            return current;
          }
          return event.data;
        });
`);

fs.writeFileSync(file, code);
