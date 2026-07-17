import re

with open('src/components/HealthBarItem.tsx', 'r') as f:
    content = f.read()

# Let's see the start of the component to add a ref
print(content[:500])

