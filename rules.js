const analysisRules = {
    javascript: [{
            id: 'unused-variable',
            type: 'Readability',
            severity: 'warning',
            title: 'Unused Variable Detected',
            description: 'This variable is declared but never used. Removing unused variables helps keep your code clean and easier to understand, reducing potential confusion and bundle size.',
            suggestion: 'Remove the unused variable declaration or ensure it is used somewhere in your code.',
            check: (code) => {
                const issues = [];
                const varRegex = /(?:const|let|var)\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=/g;
                let match;
                while ((match = varRegex.exec(code)) !== null) {
                    const varName = match[1];
                    console.log(`Found variable declaration: ${varName}`);

                    // Simple check: look for the variable name after its declaration
                    const codeAfterDeclaration = code.substring(match.index + match[0].length);
                    const varUsageRegex = new RegExp(`\\b${varName}\\b`, 'g');
                    const usages = codeAfterDeclaration.match(varUsageRegex);

                    if (!usages || usages.length === 0) {
                        const lineNumber = code.substring(0, match.index).split('\n').length;
                        console.log(`Unused variable detected: ${varName} at line ${lineNumber}`);
                        issues.push({
                            lineNumber: lineNumber,
                            snippet: code.split('\n')[lineNumber - 1].trim(),
                            message: `Variable '${varName}' is declared but never used.`,
                            ruleId: 'unused-variable'
                        });
                    }
                }
                return issues;
            },
            learn: {
                title: 'Understanding Unused Variables',
                content: `
                    <p>Unused variables are a common sign of dead code or incomplete refactoring. They can make your code harder to read by introducing unnecessary cognitive load and can sometimes lead to subtle bugs if their presence implies a function that is no longer needed.</p>
                    <p><strong>Why avoid them?</strong></p>
                    <ul>
                        <li><strong>Readability:</strong> Clutters the code and makes it harder to follow logic.</li>
                        <li><strong>Maintainability:</strong> Can lead to confusion for other developers (or your future self).</li>
                        <li><strong>Performance/Bundle Size:</strong> In production builds, unused code might not be tree-shaken, increasing file size.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>function greetUser(name) {
  const greeting = "Hello, "; // Unused
  console.log(name);
}</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>function greetUser(name) {
  console.log("Hello, " + name);
}
// Or if greeting is needed:
// function greetUser(name) {
//   const greeting = "Hello, ";
//   console.log(greeting + name);
// }</code></pre>
                `
            }
        },
        {
            id: 'deep-nesting-js',
            type: 'Maintainability',
            severity: 'warning',
            title: 'Deeply Nested Code Block',
            description: 'Excessive nesting (e.g., too many if/else, for, while loops within each other) makes code difficult to read, understand, and debug. It often indicates a complex logic that could be simplified.',
            suggestion: 'Refactor deeply nested code using techniques like early returns, breaking down functions, or using array methods (map, filter, reduce) instead of nested loops.',
            check: (code) => {
                const issues = [];
                const lines = code.split('\n');
                let maxDepth = 0;
                let currentDepth = 0;
                let depthLine = 0;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    currentDepth += (line.split('{').length - 1);
                    currentDepth -= (line.split('}').length - 1);

                    if (currentDepth > maxDepth) {
                        maxDepth = currentDepth;
                        depthLine = i + 1;
                    }

                    if (currentDepth < 0) currentDepth = 0;
                }

                if (maxDepth >= 4) {
                    issues.push({
                        lineNumber: depthLine,
                        snippet: lines[depthLine - 1].trim(),
                        message: `Nesting depth of ${maxDepth} detected. Consider refactoring for readability.`,
                        ruleId: 'deep-nesting-js'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Avoiding Deeply Nested Code',
                content: `
                    <p>Deeply nested code, often called "arrowhead code" due to its shape, is a common code smell. It occurs when you have many levels of conditional statements or loops, making the code's control flow hard to follow.</p>
                    <p><strong>Problems with deep nesting:</strong></p>
                    <ul>
                        <li><strong>Readability:</strong> Hard to quickly grasp the logic.</li>
                        <li><strong>Debugging:</strong> Tracing execution paths becomes complex.</li>
                        <li><strong>Maintainability:</strong> Difficult to modify without introducing new bugs.</li>
                        <li><strong>Testability:</strong> Each nested path increases complexity, requiring more tests.</li>
                    </ul>
                    <p><strong>Techniques to reduce nesting:</strong></p>
                    <ul>
                        <li><strong>Early Return/Guard Clauses:</strong> Handle invalid conditions at the beginning of a function.</li>
                        <li><strong>Extract Function:</strong> Move nested logic into separate, smaller functions.</li>
                        <li><strong>Strategy Pattern:</strong> For complex conditional logic, consider using a more organized pattern.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>function processOrder(order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.total > 0) {
        // ... logic ...
        if (order.status === 'pending') {
          // ... more logic ...
        }
      }
    }
  }
}</code></pre>
                    <h4>Good Practice (using Early Return):</h4>
                    <pre class="code-example good"><code>function processOrder(order) {
  if (!order || order.items.length === 0 || order.total <= 0) {
    return; // Early exit for invalid orders
  }
  if (order.status !== 'pending') {
    return; // Early exit for non-pending orders
  }
  // ... main logic for valid, pending orders ...
}</code></pre>
                `
            }
        },
        {
            id: 'long-function-js',
            type: 'Maintainability',
            severity: 'warning',
            title: 'Function Exceeds Max Lines',
            description: 'Functions that are too long (e.g., over 30-50 lines) often do too many things. This violates the Single Responsibility Principle and makes them hard to read, test, and reuse.',
            suggestion: 'Break down this function into smaller, more focused functions. Each function should ideally do one thing and do it well.',
            check: (code) => {
                const issues = [];
                const lines = code.split('\n');
                let inFunction = false;
                let functionStartLine = 0;
                let functionName = '';
                let braceCount = 0;
                const FUNCTION_MAX_LINES = 30;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const functionMatch = line.match(/(?:function\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*\(|const\s+([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*function\s*\(|([a-zA-Z_$][0-9a-zA-Z_$]*)\s*=\s*>\s*{)/);

                    if (functionMatch && !inFunction) {
                        inFunction = true;
                        functionStartLine = i + 1;
                        functionName = functionMatch[1] || functionMatch[2] || 'anonymous';
                        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
                    } else if (inFunction) {
                        braceCount += (line.match(/{/g) || []).length;
                        braceCount -= (line.match(/}/g) || []).length;

                        if (braceCount === 0 && line.includes('}')) {
                            const functionLength = (i + 1) - functionStartLine + 1;
                            if (functionLength > FUNCTION_MAX_LINES) {
                                issues.push({
                                    lineNumber: functionStartLine,
                                    snippet: `function ${functionName}(...)`,
                                    message: `Function '${functionName}' is ${functionLength} lines long. Consider breaking it down.`,
                                    ruleId: 'long-function-js'
                                });
                            }
                            inFunction = false;
                            functionStartLine = 0;
                            functionName = '';
                        }
                    }
                }
                return issues;
            },
            learn: {
                title: 'The Case for Small Functions',
                content: `
                    <p>Long functions are a strong indicator that a function is doing too much. This makes them:</p>
                    <ul>
                        <li><strong>Hard to read:</strong> Too much going on at once.</li>
                        <li><strong>Hard to test:</strong> More complex logic means more test cases.</li>
                        <li><strong>Hard to debug:</strong> Pinpointing issues in a large function is tedious.</li>
                        <li><strong>Less reusable:</strong> Specific logic tied into a large block.</li>
                    </ul>
                    <p>The "Single Responsibility Principle" suggests that a function should have only one reason to change. By breaking down large functions into smaller, focused ones, you improve modularity, readability, and testability.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>function processUserData(user, data) {
  // Validate user
  // Authenticate user
  // Fetch additional data
  // Transform data
  // Save data to database
  // Send confirmation email
  // Log activity
  // ... many lines of code ...
}</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>function validateUser(user) { /* ... */ }
function authenticateUser(user) { /* ... */ }
function fetchAndTransformData(data) { /* ... */ }
function saveUserData(processedData) { /* ... */ }
function sendConfirmation(user) { /* ... */ }
function logUserActivity(user, activity) { /* ... */ }

function processUserData(user, data) {
  validateUser(user);
  authenticateUser(user);
  const transformedData = fetchAndTransformData(data);
  saveUserData(transformedData);
  sendConfirmation(user);
  logUserActivity(user, 'data processed');
}</code></pre>
                `
            }
        },
        {
            id: 'global-variable',
            type: 'Best Practice',
            severity: 'error',
            title: 'Global Variable Detected',
            description: 'Declaring variables without `const`, `let`, or `var` makes them global, which can lead to conflicts and make code harder to manage. It\'s generally considered bad practice to pollute the global namespace.',
            suggestion: 'Always declare variables with `const`, `let`, or `var` to ensure they are properly scoped. Use `const` by default, and `let` if the variable needs to be reassigned.',
            check: (code) => {
                const issues = [];
                const lines = code.split('\n');
                const globalVarRegex = /^(?!\s*(?:const|let|var|function|class|import|export|if|for|while|switch|try)\s)[a-zA-Z_$][0-9a-zA-Z_$]*\s*=/gm;

                let match;
                while ((match = globalVarRegex.exec(code)) !== null) {
                    const lineContent = lines[code.substring(0, match.index).split('\n').length - 1];
                    // Basic check to avoid false positives on assignments within blocks or non-declarations
                    if (lineContent && !lineContent.trim().startsWith('//') && !lineContent.trim().startsWith('/*') &&
                        !lineContent.includes('const') && !lineContent.includes('let') && !lineContent.includes('var') &&
                        !lineContent.includes('function') && !lineContent.includes('class')) {
                        const lineNumber = code.substring(0, match.index).split('\n').length;
                        issues.push({
                            lineNumber: lineNumber,
                            snippet: lineContent.trim(),
                            message: `Possible global variable '${match[0].split('=')[0].trim()}' detected.`,
                            ruleId: 'global-variable'
                        });
                    }
                }
                return issues;
            },
            learn: {
                title: 'Avoiding Global Variable Pollution',
                content: `
                    <p>Global variables are variables accessible from anywhere in your code. While sometimes necessary, excessive use of global variables is considered bad practice because it can lead to:</p>
                    <ul>
                        <li><strong>Name Collisions:</strong> Different parts of your code (or third-party libraries) might use the same variable name, leading to unexpected overwrites.</li>
                        <li><strong>Harder Debugging:</strong> It's difficult to track where a global variable was changed, making debugging challenging.</li>
                        <li><strong>Reduced Reusability:</strong> Code relying on global state is harder to reuse in different contexts.</li>
                        <li><strong>Security Risks:</strong> Malicious scripts could potentially modify global variables.</li>
                    </ul>
                    <p>Always declare your variables using <code>const</code> or <code>let</code> to limit their scope to the block, function, or module they are defined in. This practice is called "scoping" and helps keep your code organized and predictable.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>appName = "MyApp"; // Accidentally global

function init() {
  version = "1.0"; // Accidentally global
  console.log(appName + " " + version);
}</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>const appName = "MyApp"; // Module-scoped or global by design if needed

function init() {
  const version = "1.0"; // Function-scoped
  console.log(appName + " " + version);
}</code></pre>
                `
            }
        },
        {
            id: 'eval-usage',
            type: 'Security',
            severity: 'error',
            title: '`eval()` Usage Detected',
            description: 'The `eval()` function executes JavaScript code represented as a string. It is a security risk as it can execute arbitrary code, and it also makes debugging and optimization difficult.',
            suggestion: 'Avoid using `eval()`. There are almost always safer and more efficient alternatives, such as `JSON.parse()` for parsing JSON strings, or direct function calls and object lookups instead of dynamic code execution.',
            check: (code) => {
                const issues = [];
                const regex = /eval\s*\(/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: '`eval()` function detected. This is a security risk.',
                        ruleId: 'eval-usage'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Why `eval()` is Dangerous',
                content: `
                    <p>The <code>eval()</code> function in JavaScript takes a string argument and executes it as a JavaScript code. While it might seem convenient, its use is highly discouraged due to significant security and performance implications.</p>
                    <p><strong>Problems with <code>eval()</code>:</strong></p>
                    <ul>
                        <li><strong>Security Vulnerabilities:</strong> If you use <code>eval()</code> with a string that originates from user input, it can allow malicious code injection (Cross-Site Scripting - XSS).</li>
                        <li><strong>Performance Issues:</strong> JavaScript engines cannot optimize code that uses <code>eval()</code> because the content of the string is not known until runtime, preventing static analysis.</li>
                        <li><strong>Debugging Difficulty:</strong> Code executed by <code>eval()</code> does not appear in source files, making debugging very hard.</li>
                        <li><strong>Maintainability:</strong> It makes code harder to read and understand because the executed code is not directly visible.</li>
                    </ul>
                    <p>Always look for safer alternatives. For example, if you need to parse JSON, use <code>JSON.parse()</code>. If you need to access object properties dynamically, use bracket notation (<code>obj[propName]</code>).</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>const userInput = "console.log('Hello from eval!');";
eval(userInput);
</code></pre>
                    <h4>Good Practice (using safer alternatives):</h4>
                    <pre class="code-example good"><code>// Instead of eval() for JSON:
const jsonString = '{"name": "Alice"}';
const data = JSON.parse(jsonString);
console.log(data.name);

// Instead of eval() for dynamic property access:
const obj = { greeting: "Hello" };
const prop = "greeting";
console.log(obj[prop]);
</code></pre>
                `
            }
        },
        {
            id: 'console-log',
            type: 'Debugging',
            severity: 'suggestion',
            title: '`console.log` Detected',
            description: '`console.log` statements are useful for debugging but should generally be removed before deploying code to production. They can expose sensitive information and impact performance.',
            suggestion: 'Remove `console.log` statements from production code. Use a proper logging library or conditional logging based on environment variables for debugging purposes.',
            check: (code) => {
                const issues = [];
                const regex = /console\.(?:log|warn|error|info|debug)\s*\(/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: '`console.log` or similar statement detected.',
                        ruleId: 'console-log'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Managing Console Statements in Production',
                content: `
                    <p>While <code>console.log()</code> and other <code>console</code> methods are invaluable for debugging during development, they should generally be removed or managed carefully in production environments.</p>
                    <p><strong>Why manage them?</strong></p>
                    <ul>
                        <li><strong>Information Leakage:</strong> Sensitive data, API keys, or internal logic might be logged, becoming visible to anyone opening the browser's developer console.</li>
                        <li><strong>Performance Overhead:</strong> Extensive logging can slightly impact application performance, especially in loops or frequently called functions.</li>
                        <li><strong>Clutter:</strong> Too many console messages can make it hard to spot genuine issues in the browser console.</li>
                    </ul>
                    <p><strong>Best Practices:</strong></p>
                    <ul>
                        <li><strong>Conditional Logging:</strong> Use environment variables (e.g., <code>process.env.NODE_ENV !== 'production'</code>) to enable/disable logging.</li>
                        <li><strong>Remove Manually/Automated:</strong> Remove them before deployment. Build tools can sometimes strip them automatically.</li>
                        <li><strong>Logging Libraries:</strong> For complex applications, use a dedicated logging library that allows for different log levels (debug, info, warn, error) and can be configured for production.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>function calculatePrice(item) {
  console.log("Calculating price for:", item.name);
  return item.price * item.quantity;
}</code></pre>
                    <h4>Good Practice (conditional logging):</h4>
                    <pre class="code-example good"><code>function calculatePrice(item) {
  if (process.env.NODE_ENV !== 'production') {
    console.log("Calculating price for:", item.name);
  }
  return item.price * item.quantity;
}</code></pre>
                `
            }
        },
        {
            id: 'strict-equality',
            type: 'Best Practice',
            severity: 'warning',
            title: 'Loose Equality (==) Used',
            description: 'Using `==` (loose equality) instead of `===` (strict equality) can lead to unexpected type coercion and subtle bugs. Strict equality compares both value and type without type conversion.',
            suggestion: 'Prefer `===` (strict equality) over `==` (loose equality) to avoid unexpected type coercion. Use `==` only when you fully understand its behavior and specifically intend for type coercion to occur.',
            check: (code) => {
                const issues = [];
                const regex = /(?<![!=\s-+*\/%&|^~])==(?!=)/g; // Matches == but not === or !== etc.
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: 'Loose equality (==) detected. Consider using strict equality (===).',
                        ruleId: 'strict-equality'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Strict vs. Loose Equality',
                content: `
                    <p>In JavaScript, there are two main ways to compare values for equality: loose equality (<code>==</code>) and strict equality (<code>===</code>).</p>
                    <ul>
                        <li><strong>Loose Equality (<code>==</code>):</strong> Compares values after performing type coercion (converting operands to a common type). This can lead to surprising results.</li>
                        <li><strong>Strict Equality (<code>===</code>):</strong> Compares values without performing type coercion. Both the value and the type must be the same for the comparison to be true.</li>
                    </ul>
                    <p><strong>Why prefer <code>===</code>?</strong></p>
                    <ul>
                        <li><strong>Predictability:</strong> <code>===</code> behaves consistently and avoids unexpected type conversions.</li>
                        <li><strong>Fewer Bugs:</strong> Reduces the chance of subtle bugs caused by implicit type coercion.</li>
                        <li><strong>Clarity:</strong> Makes your code's intent clearer, as it explicitly states that both value and type should match.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Loose Equality (Bad Practice):</h4>
                    <pre class="code-example bad"><code>console.log(false == 0); // true (boolean to number coercion)
console.log("1" == 1);   // true (string to number coercion)
console.log(null == undefined); // true</code></pre>
                    <h4>Strict Equality (Good Practice):</h4>
                    <pre class="code-example good"><code>console.log(false === 0); // false
console.log("1" === 1);   // false
console.log(null === undefined); // false</code></pre>
                `
            }
        },
        {
            id: 'for-in-array',
            type: 'Performance',
            severity: 'warning',
            title: '`for...in` Used on Array',
            description: 'Using `for...in` to iterate over arrays is not recommended in JavaScript. It iterates over enumerable properties, which can include inherited properties, and the order of iteration is not guaranteed. It\'s better suited for iterating over object keys.',
            suggestion: 'Use `for...of`, `forEach()`, or a traditional `for` loop to iterate over array elements. These methods iterate directly over values and maintain predictable order.',
            check: (code) => {
                const issues = [];
                // This regex attempts to find `for (...) in (...)` where the second part looks like an array access or declaration
                // It's a heuristic and might have false positives/negatives without a proper AST parser.
                const regex = /for\s*\([a-zA-Z_$][0-9a-zA-Z_$]*\s+in\s+([a-zA-Z_$][0-9a-zA-Z_$]*\s*=\s*\[.*?\]|[a-zA-Z_$][0-9a-zA-Z_$]*\[.*?\])\s*\)/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: '`for...in` loop used on what appears to be an array. Consider `for...of` or `forEach`.',
                        ruleId: 'for-in-array'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Iterating Arrays: `for...of` vs. `for...in`',
                content: `
                    <p>In JavaScript, choosing the right loop for arrays is important for correctness and performance. The <code>for...in</code> loop is designed for iterating over object properties, not array elements.</p>
                    <ul>
                        <li><strong><code>for...in</code>:</strong> Iterates over <strong>enumerable property names (keys)</strong> of an object. This includes inherited properties. The order of iteration is not guaranteed.</li>
                        <li><strong><code>for...of</code>:</strong> Iterates over <strong>iterable values</strong> (like array elements, strings, Maps, Sets). It's the modern and recommended way to loop over arrays.</li>
                        <li><strong><code>Array.prototype.forEach()</code>:</strong> A high-order function that executes a provided function once for each array element. Good for simple iterations.</li>
                    </ul>
                    <p><strong>Why avoid <code>for...in</code> for arrays?</strong></p>
                    <ul>
                        <li><strong>Iterates over keys, not values:</strong> You get string indices, not the actual elements.</li>
                        <li><strong>Includes inherited properties:</strong> Can iterate over properties that are not part of the array's own elements, leading to unexpected behavior.</li>
                        <li><strong>Order not guaranteed:</strong> The order of iteration is not consistent across JavaScript engines.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice (using \`for...in\` for arrays):</h4>
                    <pre class="code-example bad"><code>const arr = ["a", "b", "c"];
for (let index in arr) {
  console.log(index); // Outputs "0", "1", "2" (strings)
  console.log(arr[index]); // Outputs "a", "b", "c"
}
Array.prototype.myCustomProp = "hello";
for (let key in arr) {
  console.log(key); // Might output "myCustomProp" too!
}</code></pre>
                    <h4>Good Practice (using \`for...of\` or \`forEach\`):</h4>
                    <pre class="code-example good"><code>const arr = ["a", "b", "c"];
// Using for...of (recommended)
for (const value of arr) {
  console.log(value); // Outputs "a", "b", "c"
}

// Using forEach
arr.forEach(value => {
  console.log(value); // Outputs "a", "b", "c"
});

// Traditional for loop
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]); // Outputs "a", "b", "c"
}</code></pre>
                `
            }
        },
        {
            id: 'empty-block',
            type: 'Readability',
            severity: 'warning',
            title: 'Empty Code Block Detected',
            description: 'An empty code block (e.g., empty `if`, `for`, `while` body, or empty `catch` block) can be a sign of incomplete code, a logical error, or unhandled exceptions. It often indicates that something was intended to be done but was left out.',
            suggestion: 'Review empty code blocks. If intentional, add a comment explaining why it\'s empty. If a `catch` block is intentionally empty, consider if logging or error handling is still needed. Otherwise, implement the missing logic.',
            check: (code) => {
                const issues = [];
                // Matches empty curly braces {} that are not part of an object literal, or followed by a semicolon
                // This is a heuristic and might not catch all cases or have false positives.
                const regex = /(?:if|for|while|switch|try|else|function)\s*\([^)]*\)\s*{\s*}(?![\s,:])/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: 'Empty code block detected.',
                        ruleId: 'empty-block'
                    });
                }
                return issues;
            },
            learn: {
                title: 'The Implications of Empty Code Blocks',
                content: `
                    <p>An empty code block, like <code>if (condition) {}</code> or an empty <code>catch {}</code>, can be problematic in several ways, even if seemingly harmless.</p>
                    <p><strong>Why are they a problem?</strong></p>
                    <ul>
                        <li><strong>Hidden Logic:</strong> It can indicate forgotten or incomplete logic, leading to unexpected program behavior.</li>
                        <li><strong>Debugging Difficulty:</strong> It's hard to tell if an empty block is intentional or an oversight without careful inspection.</li>
                        <li><strong>Suppressed Errors:</strong> An empty <code>catch</code> block will silently ignore errors, making it very difficult to diagnose issues in production.</li>
                        <li><strong>Readability:</strong> It can be confusing for other developers, raising questions about intent.</li>
                    </ul>
                    <p>If an empty block is truly intentional (e.g., a specific error should be ignored), add a clear comment explaining the rationale. Otherwise, ensure all necessary logic is implemented.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>if (user.isAdmin) {
  // What was supposed to happen here?
}
try {
  // Some risky operation
} catch (error) {
  // Error is silently ignored!
}</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>if (user.isAdmin) {
  redirectToAdminDashboard();
}

try {
  // Some risky operation
} catch (error) {
  console.error("An error occurred:", error); // Log the error
  displayUserMessage("Operation failed. Please try again.");
}

// If truly intentional (with explanation):
if (DEBUG_MODE) {
  // No-op for debugging mode, intentional
}</code></pre>
                `
            }
        },
        {
            id: 'js-assignment-in-conditional',
            type: 'Bug Risk',
            severity: 'error',
            title: 'Assignment Inside Conditional',
            description: 'Using = inside if/while/for conditions usually indicates a bug where == or === was intended.',
            suggestion: 'Replace = with === (or == if intentional) inside conditionals. If assignment is intentional, wrap it in parentheses and add a comment.',
            check: (code) => {
                const issues = [];
                const regex = /\b(if|while|for)\s*\(([^)]*)\)/g;
                let m;
                while ((m = regex.exec(code)) !== null) {
                    const expr = m[2];
                    if (/=(?![=])/g.test(expr)) {
                        const idx = m.index + m[0].indexOf(expr);
                        const lineNumber = code.substring(0, idx).split('\n').length;
                        issues.push({
                            lineNumber,
                            snippet: code.split('\n')[lineNumber - 1].trim(),
                            message: 'Possible assignment (=) in conditional. Did you mean ===?',
                            ruleId: 'js-assignment-in-conditional'
                        });
                    }
                }
                return issues;
            }
        },
        {
            id: 'dom-api-casing',
            type: 'Bug Risk',
            severity: 'error',
            title: 'DOM API Case Sensitivity',
            description: 'DOM APIs are case sensitive (e.g., getElementById). Wrong casing will cause runtime errors.',
            suggestion: 'Use correct casing: document.getElementById, document.querySelector, document.querySelectorAll, document.getElementsByClassName.',
            check: (code) => {
                const issues = [];
                const regex = /document\.(getelementbyid|getelementsbyclassname|queryselector|queryselectorall)\s*\(/gi;
                let m;
                while ((m = regex.exec(code)) !== null) {
                    const bad = m[1];
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    issues.push({
                        lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: `Incorrect casing '${bad}'. Use proper casing (e.g., getElementById).`,
                        ruleId: 'dom-api-casing'
                    });
                }
                return issues;
            }
        },
        {
            id: 'undeclared-variable',
            type: 'Bug Risk',
            severity: 'error',
            title: 'Undeclared Variable Usage',
            description: 'Using variables that are not declared leads to ReferenceError at runtime.',
            suggestion: 'Declare all variables with const/let/var before use.',
            check: (code) => {
                const issues = [];
                const declared = new Set();
                const declRegex = /\b(?:const|let|var|function|class)\s+([a-zA-Z_$][\w$]*)/g;
                let m;
                while ((m = declRegex.exec(code)) !== null) declared.add(m[1]);
                const known = new Set(['console', 'document', 'window', 'Math', 'Array', 'Object', 'Number', 'String', 'Boolean', 'Date', 'RegExp', 'JSON', 'NaN', 'Infinity', 'undefined']);
                const tokenRegex = /(^|[^.])\b([a-zA-Z_$][\w$]*)\b/g;
                const flagged = new Set();
                let tm;
                while ((tm = tokenRegex.exec(code)) !== null) {
                    const name = tm[2];
                    if (declared.has(name) || known.has(name)) continue;
                    if (/^function\s+/.test(code.substring(tm.index - 10, tm.index + name.length + 10))) continue;
                    if (flagged.has(name)) continue;
                    const lineNumber = code.substring(0, tm.index).split('\n').length;
                    flagged.add(name);
                    issues.push({
                        lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: `Undeclared variable '${name}' used.`,
                        ruleId: 'undeclared-variable'
                    });
                }
                return issues;
            }
        },
        {
            id: 'unquoted-string-literal',
            type: 'Bug Risk',
            severity: 'warning',
            title: 'Unquoted String in Call',
            description: 'Calls like console.log should pass strings in quotes. A bare word is likely a typo or undeclared variable.',
            suggestion: 'Wrap string literals in quotes: "Hello".',
            check: (code) => {
                const issues = [];
                const regex = /\b(?:console\.(?:log|warn|error|info)|alert|prompt|confirm)\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
                let m;
                while ((m = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    issues.push({
                        lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: `Unquoted word '${m[1]}' passed. Did you mean "${m[1]}"?`,
                        ruleId: 'unquoted-string-literal'
                    });
                }
                return issues;
            }
        },
        {
            id: 'unbalanced-brackets',
            type: 'Error',
            severity: 'error',
            title: 'Unbalanced Brackets/Braces/Parentheses',
            description: 'Mismatched (), [], or {} lead to syntax errors.',
            suggestion: 'Ensure each opening bracket has a matching closing bracket.',
            check: (code) => {
                const issues = [];
                const counts = { '(': 0, ')': 0, '[': 0, ']': 0, '{': 0, '}': 0 };
                for (const ch of code)
                    if (counts.hasOwnProperty(ch)) counts[ch]++;
                const diffParen = counts['('] - counts[')'];
                const diffBracket = counts['['] - counts[']'];
                const diffBrace = counts['{'] - counts['}'];
                if (diffParen !== 0 || diffBracket !== 0 || diffBrace !== 0) {
                    issues.push({
                        lineNumber: 1,
                        snippet: code.split('\n')[0].trim(),
                        message: `Unbalanced brackets: () diff=${diffParen}, [] diff=${diffBracket}, {} diff=${diffBrace}.`,
                        ruleId: 'unbalanced-brackets'
                    });
                }
                return issues;
            }
        },
        {
            id: 'dom-access-before-ready',
            type: 'Best Practice',
            severity: 'warning',
            title: 'DOM Access Before Ready',
            description: 'Accessing DOM elements before DOMContentLoaded can return null.',
            suggestion: 'Wrap DOM access in DOMContentLoaded or place scripts at the end of body or use defer.',
            check: (code) => {
                const issues = [];
                const domCall = /(document\.(getElementById|querySelector|querySelectorAll)\s*\()/;
                if (domCall.test(code) && !/DOMContentLoaded|window\.onload/.test(code)) {
                    const idx = code.search(domCall);
                    const lineNumber = idx === -1 ? 1 : code.substring(0, idx).split('\n').length;
                    issues.push({
                        lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: 'DOM access detected without DOMContentLoaded/onload guard.',
                        ruleId: 'dom-access-before-ready'
                    });
                }
                return issues;
            }
        }
    ],
    html: [{
            id: 'inline-style',
            type: 'Maintainability',
            severity: 'error',
            title: 'Inline Style Detected',
            description: 'Using `style` attributes directly in HTML elements mixes content with presentation, making your CSS harder to manage, reuse, and maintain. It also clutters the HTML.',
            suggestion: 'Move inline styles to external CSS files or internal `<style>` blocks. Use CSS classes for styling elements consistently.',
            check: (code) => {
                const issues = [];
                const regex = /<[^>]+style=["'][^"']+["'][^>]*>/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: match[0].trim(),
                        message: 'Inline style found.',
                        ruleId: 'inline-style'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Why Avoid Inline Styles?',
                content: `
                    <p>Inline styles are CSS declarations applied directly to an HTML element using the <code>style</code> attribute. While they work, they are generally considered bad practice for several reasons:</p>
                    <ul>
                        <li><strong>Separation of Concerns:</strong> They violate the principle of separating structure (HTML) from presentation (CSS).</li>
                        <li><strong>Maintainability:</strong> Styles are scattered throughout your HTML, making global changes difficult.</li>
                        <li><strong>Reusability:</strong> You cannot easily reuse styles across multiple elements or pages.</li>
                        <li><strong>Specificity Issues:</strong> Inline styles have high specificity, making them hard to override with external CSS.</li>
                    </ul>
                    <p>The best practice is to use external CSS stylesheets and apply styles using classes and IDs.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>&lt;p style="color: blue; font-size: 16px;"&gt;Hello World&lt;/p&gt;</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>&lt;!-- In HTML --&gt;
&lt;p class="blue-text"&gt;Hello World&lt;/p&gt;

&lt;!-- In style.css or &lt;style&gt; tag --&gt;
&lt;style&gt;
.blue-text {
  color: blue;
  font-size: 16px;
}
&lt;/style&gt;</code></pre>
                `
            }
        },
        {
            id: 'missing-alt',
            type: 'Accessibility',
            severity: 'error',
            title: 'Missing Alt Attribute for Image',
            description: 'Image elements (`<img>`) should always have an `alt` attribute. This provides descriptive text for screen readers, improving accessibility for visually impaired users, and is displayed if the image fails to load.',
            suggestion: 'Add a meaningful `alt` attribute to all `<img>` tags. If the image is purely decorative, use an empty `alt=""`.',
            check: (code) => {
                const issues = [];
                const regex = /<img(?![^>]*alt=["'](?:["']|\\s*>))[^>]*>/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: match[0].trim(),
                        message: 'Image tag has no alt attribute or an empty one.',
                        ruleId: 'missing-alt'
                    });
                }
                return issues;
            },
            learn: {
                title: 'The Importance of Alt Text',
                content: `
                    <p>The <code>alt</code> (alternative text) attribute for HTML <code>&lt;img&gt;</code> tags is crucial for web accessibility and usability.</p>
                    <p><strong>Why is it important?</strong></p>
                    <ul>
                        <li><strong>Screen Readers:</strong> Visually impaired users rely on screen readers that read out the alt text to describe the image.</li>
                        <li><strong>Image Loading Failures:</strong> If an image fails to load (due to broken links, slow connections), the alt text is displayed instead.</li>
                        <li><strong>SEO:</b> Search engines use alt text to understand image content, which can improve your site's search ranking.</li>
                        <li><strong>Context:</strong> Provides context for users who have images disabled in their browser.</li>
                    </ul>
                    <p><strong>How to write good alt text:</strong></p>
                    <ul>
                        <li>Be concise but descriptive.</li>
                        <li>Convey the meaning or purpose of the image.</li>
                        <li>Avoid phrases like "image of" or "picture of".</li>
                        <li>For decorative images, use <code>alt=""</code>.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>&lt;img src="sunset.jpg"&gt;
&lt;img src="icon.png" alt=""&gt; &lt;!-- If icon is meaningful and not decorative --&gt;</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>&lt;img src="sunset.jpg" alt="Vibrant sunset over a calm ocean"&gt;
&lt;img src="search-icon.png" alt="Search icon"&gt; &lt;!-- If icon represents an action --&gt;
&lt;img src="decorative-line.png" alt=""&gt; &lt;!-- If purely decorative --&gt;</code></pre>
                `
            }
        },
        {
            id: 'deprecated-html-tag',
            type: 'Maintainability',
            severity: 'error',
            title: 'Deprecated HTML Tag Used',
            description: 'Using deprecated HTML tags or attributes can lead to inconsistent behavior across browsers, accessibility issues, and may not be supported in future HTML versions. Modern alternatives should be preferred.',
            suggestion: 'Replace deprecated HTML tags/attributes with their modern, semantic, and accessible equivalents. Refer to the MDN Web Docs for up-to-date HTML specifications.',
            check: (code) => {
                const issues = [];
                const deprecatedTags = ['acronym', 'applet', 'basefont', 'big', 'center', 'dir', 'font', 'frame', 'frameset', 'isindex', 'noframes', 's', 'strike', 'tt', 'u'];
                const tagRegex = new RegExp(`<(${deprecatedTags.join('|')})[^>]*>`, 'gi');
                let match;
                while ((match = tagRegex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: match[0].trim(),
                        message: `Deprecated HTML tag '<${match[1]}>' detected.`,
                        ruleId: 'deprecated-html-tag'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Avoiding Deprecated HTML',
                content: `
                    <p>Deprecated HTML tags and attributes are elements that are no longer recommended for use by W3C (World Wide Web Consortium) or WHATWG (Web Hypertext Application Technology Working Group). While browsers might still support them for backward compatibility, their use should be avoided.</p>
                    <p><strong>Why avoid deprecated HTML?</strong></p>
                    <ul>
                        <li><strong>Future Compatibility:</strong> They might be removed in future HTML versions, breaking your site.</li>
                        <li><strong>Accessibility:</strong> Modern semantic HTML provides better structure for assistive technologies.</li>
                        <li><strong>Maintainability:</strong> Code becomes harder to understand and update if it uses outdated practices.</li>
                        <li><strong>Separation of Concerns:</strong> Many deprecated tags (like <code>&lt;font&gt;</code> or <code>&lt;center&gt;</code>) were used for styling, which should now be handled by CSS.</li>
                    </ul>
                    <p>Always use modern HTML5 elements that convey meaning (semantic HTML) and control presentation with CSS.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>&lt;center&gt;&lt;font color="red"&gt;Important Message&lt;/font&gt;&lt;/center&gt;
&lt;strike&gt;Old Price&lt;/strike&gt;</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>&lt;!-- In HTML --&gt;
&lt;p class="centered-red-text"&gt;Important Message&lt;/p&gt;
&lt;del&gt;Old Price&lt;/del&gt;

&lt;!-- In CSS --&gt;
&lt;style&gt;
.centered-red-text {
  text-align: center;
  color: red;
}
&lt;/style&gt;</code></pre>
                `
            }
        },
        {
            id: 'no-doctype',
            type: 'Best Practice',
            severity: 'error',
            title: 'Missing or Invalid Doctype Declaration',
            description: 'Every HTML document should start with a `<!DOCTYPE html>` declaration. This tells the browser which HTML standard to use, preventing "quirks mode" and ensuring consistent rendering.',
            suggestion: 'Add `<!DOCTYPE html>` as the very first line of your HTML document. This is the standard HTML5 doctype.',
            check: (code) => {
                const issues = [];
                const doctypeRegex = /^\s*<!DOCTYPE html>/i;
                if (!doctypeRegex.test(code.split('\n')[0])) {
                    issues.push({
                        lineNumber: 1,
                        snippet: code.split('\n')[0].trim().substring(0, 50) + '...',
                        message: 'Missing or invalid <!DOCTYPE html> declaration.',
                        ruleId: 'no-doctype'
                    });
                }
                return issues;
            },
            learn: {
                title: 'The Importance of Doctype',
                content: `
                    <p>The <code>&lt;!DOCTYPE html&gt;</code> declaration is not an HTML tag; it's an "information" to the browser about what document type to expect. For modern web pages, it declares that the document is an HTML5 document.</p>
                    <p><strong>Why is it important?</strong></p>
                    <ul>
                        <li><strong>Standard Mode Rendering:</strong> It ensures that browsers render your page in "standards mode," which follows modern web standards and CSS specifications. Without it, browsers might go into "quirks mode," which attempts to emulate older, non-standard behaviors, leading to inconsistent rendering across browsers.</li>
                        <li><strong>Consistency:</strong> Guarantees that your HTML and CSS behave predictably across different user agents.</li>
                        <li><strong>Future Compatibility:</strong> Prepares your document for new web features and technologies.</li>
                    </ul>
                    <p>Always include <code>&lt;!DOCTYPE html&gt;</code> as the very first line of your HTML file.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>&lt;html&gt;
&lt;head&gt;...&lt;/head&gt;
&lt;body&gt;...&lt;/body&gt;
&lt;/html&gt;</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;...&lt;/head&gt;
&lt;body&gt;...&lt;/body&gt;
&lt;/html&gt;</code></pre>
                `
            }
        },
        {
            id: 'incomplete-html-tag',
            type: 'Error',
            severity: 'error',
            title: 'Incomplete HTML Tag Syntax',
            description: 'HTML tags must be properly opened and closed with angle brackets (< and >). A tag that is opened but not closed on the same line can indicate a syntax error, leading to rendering issues or unexpected behavior.',
            suggestion: 'Ensure all HTML tags have a matching closing angle bracket (>). Check for typos or missing characters in your tag declarations.',
            check: (code) => {
                const issues = [];
                const lines = code.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    console.log(`Checking line ${i + 1}: "${line}"`);

                    // Check for opening tags that do not have a closing '>' on the same line
                    if (line.startsWith('<') && !line.startsWith('<!') && !line.includes('>') && line.length > 1) {
                        console.log(`Incomplete opening tag found at line ${i + 1}: "${line}"`);
                        issues.push({
                            lineNumber: i + 1,
                            snippet: line,
                            message: 'Incomplete HTML opening tag: missing closing \'>\'.',
                            ruleId: 'incomplete-html-tag'
                        });
                    }
                    // Check for closing tags that do not have a closing '>' on the same line
                    if (line.startsWith('</') && !line.includes('>') && line.length > 2) {
                        console.log(`Incomplete closing tag found at line ${i + 1}: "${line}"`);
                        issues.push({
                            lineNumber: i + 1,
                            snippet: line,
                            message: 'Incomplete HTML closing tag: missing closing \'>\'.',
                            ruleId: 'incomplete-html-tag'
                        });
                    }
                }
                return issues;
            },
            learn: {
                title: 'Correct HTML Tag Syntax',
                content: `
                    <p>Properly formed HTML tags are essential for a well-structured and functional web page. Missing angle brackets (<code>&lt;</code>, <code>&gt;</code>) or unclosed attribute quotes can lead to unexpected rendering, layout issues, and problems with accessibility and JavaScript interactions.</p>
                    <p>Browsers try to interpret malformed HTML, but this often leads to inconsistent behavior across different browsers and can make debugging very difficult. It's best practice to always ensure your HTML syntax is correct.</p>
                    <p><strong>Common malformed tag issues:</strong></p>
                    <ul>
                        <li>Missing closing <code>&gt;</code> on an opening tag (e.g., <code>&lt;div class="container"</code>)</li>
                        <li>Missing closing <code>&gt;</code> on a closing tag (e.g., <code>&lt;/div</code>)</li>
                        <li>Unclosed attribute quotes (e.g., <code>&lt;img src="image.jpg alt="Description"&gt;</code>)</li>
                    </ul>
                    <p>Always double-check your tag syntax, especially after manual edits or when concatenating strings to form HTML.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>&lt;div class="my-class
  &lt;p&gt;Some content&lt;/p&gt;
&lt;/div</code></pre>
                    <h4>Good Practice:</h4>
                    <pre class="code-example good"><code>&lt;div class="my-class"&gt;
  &lt;p&gt;Some content&lt;/p&gt;
&lt;/div&gt;</code></pre>
                `
            }
        },
        {
            id: 'duplicate-id-attribute',
            type: 'Accessibility',
            severity: 'error',
            title: 'Duplicate id Attributes in HTML',
            description: 'HTML id attributes must be unique within a page. Duplicate ids can break styling and JavaScript selectors.',
            suggestion: 'Ensure each element has a unique id. Convert repeated ids to classes if styling multiple elements.',
            check: (code) => {
                const issues = [];
                const idRegex = /id=["']([^"']+)["']/g;
                const lines = code.split('\n');
                const seen = {};
                let match;
                while ((match = idRegex.exec(code)) !== null) {
                    const id = match[1];
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    (seen[id] = seen[id] || []).push(lineNumber);
                }
                Object.entries(seen).forEach(([id, arr]) => {
                    if (arr.length > 1) {
                        arr.slice(1).forEach(ln => {
                            issues.push({
                                lineNumber: ln,
                                snippet: (lines[ln - 1] || '').trim(),
                                message: `Duplicate id '${id}' detected.`,
                                ruleId: 'duplicate-id-attribute'
                            });
                        });
                    }
                });
                return issues;
            }
        },
        {
            id: 'wrong-nesting',
            type: 'Error',
            severity: 'error',
            title: 'Wrong or Mismatched Tag Nesting',
            description: 'HTML tags must be properly nested. A closing tag must match the most recent unclosed opening tag.',
            suggestion: 'Fix tag order so that closing tags match their corresponding opening tags (LIFO).',
            check: (code) => {
                const issues = [];
                const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
                const tokenRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>/g;
                const lines = code.split('\n');
                const stack = [];
                let m;
                while ((m = tokenRegex.exec(code)) !== null) {
                    const whole = m[0];
                    const tag = m[1].toLowerCase();
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    if (whole.startsWith('</')) {
                        if (stack.length === 0) {
                            issues.push({ lineNumber, snippet: (lines[lineNumber - 1] || '').trim() || whole, message: `Closing tag </${tag}> has no opening tag.`, ruleId: 'wrong-nesting' });
                            continue;
                        }
                        const last = stack[stack.length - 1];
                        if (last.tag !== tag) {
                            issues.push({ lineNumber, snippet: (lines[lineNumber - 1] || '').trim() || whole, message: `Mismatched closing tag </${tag}>. Expected </${last.tag}>.`, ruleId: 'wrong-nesting' });
                        } else {
                            stack.pop();
                        }
                    } else {
                        if (!voidTags.has(tag) && !whole.endsWith('/>')) {
                            stack.push({ tag, lineNumber });
                        }
                    }
                }
                stack.forEach(s => {
                    issues.push({ lineNumber: s.lineNumber, snippet: (lines[s.lineNumber - 1] || '').trim() || `<${s.tag}>`, message: `Unclosed tag <${s.tag}> detected.`, ruleId: 'wrong-nesting' });
                });
                return issues;
            }
        },
        {
            id: 'html-linking-issues',
            type: 'Best Practice',
            severity: 'warning',
            title: 'Possible Wrong File Linking',
            description: 'Stylesheets should typically end with .css and scripts with .js. Incorrect paths or extensions can break loading.',
            suggestion: 'Ensure <link rel="stylesheet"> points to .css and <script src> points to .js, and paths are valid.',
            check: (code) => {
                const issues = [];
                const lines = code.split('\n');
                const linkRegex = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
                const hrefRegex = /href=["']([^"']+)["']/i;
                const scriptRegex = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
                let m;
                while ((m = linkRegex.exec(code)) !== null) {
                    const tag = m[0];
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    const href = (tag.match(hrefRegex) || [null, ''])[1];
                    if (!href || !/\.css(\?|#|$)/i.test(href)) {
                        issues.push({ lineNumber, snippet: (lines[lineNumber - 1] || '').trim() || tag, message: 'Stylesheet link may be incorrect or missing .css extension.', ruleId: 'html-linking-issues' });
                    }
                }
                while ((m = scriptRegex.exec(code)) !== null) {
                    const src = m[1];
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    if (!/\.js(\?|#|$)/i.test(src)) {
                        issues.push({ lineNumber, snippet: (lines[lineNumber - 1] || '').trim() || m[0], message: 'Script source may be incorrect or missing .js extension.', ruleId: 'html-linking-issues' });
                    }
                }
                return issues;
            }
        }
    ],
    css: [{
            id: 'important-usage',
            type: 'Maintainability',
            severity: 'warning',
            title: 'Usage of !important',
            description: 'Using `!important` is generally an anti-pattern in CSS. It breaks the natural cascade and makes your styles difficult to override, leading to maintenance nightmares and unpredictable behavior.',
            suggestion: 'Refactor your CSS to rely on proper specificity, cascade, and order of rules instead of `!important`. Consider using more specific selectors or restructuring your stylesheets.',
            check: (code) => {
                const issues = [];
                const regex = /!important/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    console.log(`!important found at line ${lineNumber}`);
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: '`!important` flag detected.',
                        ruleId: 'important-usage'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Why `!important` is Problematic',
                content: `
                    <p>The <code>!important</code> flag in CSS is a way to make a property value take precedence over all other declarations, even those with higher specificity or that are defined later in the stylesheet.</p>
                    <p><strong>Why is it bad practice?</strong></p>
                    <ul>
                        <li><strong>Breaks Cascade:</strong> It overrides the normal cascading rules, making your CSS harder to predict.</li>
                        <li><strong>Hard to Override:</strong> Once you use <code>!important</code>, the only way to override it is with another <code>!important</code>, leading to an "important war".</li>
                        <li><strong>Maintainability Nightmare:</strong> Makes debugging and modifying styles extremely difficult, especially in large codebases.</li>
                        <li><strong>Limited Reusability:</strong> Styles become less flexible and harder to adapt.</li>
                    </ul>
                    <p>Reserve <code>!important</code> only for very specific, unavoidable cases like utility classes or overriding third-party styles, and use it sparingly.</p>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice:</h4>
                    <pre class="code-example bad"><code>.my-button {
  background-color: red !important;
}</code></pre>
                    <h4>Good Practice (using specificity):</h4>
                    <pre class="code-example good"><code>/* More specific selector */
button.primary-button {
  background-color: blue;
}

/* Or order of rules */
.my-button {
  background-color: green;
}

.my-button.active { /* This will apply if .active is also present */
  background-color: purple;
}</code></pre>
                `
            }
        },
        {
            id: 'id-selector-overuse',
            type: 'Maintainability',
            severity: 'suggestion',
            title: 'Overuse of ID Selectors',
            description: 'ID selectors (`#myid`) have high specificity and are not reusable, making CSS harder to maintain and less flexible. They should be used sparingly, primarily for unique document elements or JavaScript hooks.',
            suggestion: 'Prefer using class selectors (`.my-class`) or attribute selectors over ID selectors for styling. Reserve IDs for unique elements or when JavaScript needs a direct reference.',
            check: (code) => {
                const issues = [];
                const regex = /#[a-zA-Z0-9_-]+/g;
                let match;
                const idCounts = {};
                while ((match = regex.exec(code)) !== null) {
                    const id = match[0];
                    idCounts[id] = (idCounts[id] || 0) + 1;
                }
                for (const id in idCounts) {
                    if (idCounts[id] > 1) { // Flag IDs used more than once in CSS
                        const lineNumber = code.substring(0, code.indexOf(id)).split('\n').length; // Find first occurrence
                        issues.push({
                            lineNumber: lineNumber,
                            snippet: code.split('\n')[lineNumber - 1].trim(),
                            message: `ID selector '${id}' used multiple times. IDs should be unique. Consider using a class instead.`,
                            ruleId: 'id-selector-overuse'
                        });
                    }
                }
                return issues;
            },
            learn: {
                title: 'When to Use Classes vs. IDs in CSS',
                content: `
                    <p>In CSS, both ID selectors (prefixed with <code>#</code>, e.g., <code>#header</code>) and class selectors (prefixed with <code>.</code>, e.g., <code>.button</code>) are used to target HTML elements for styling. However, they have different purposes and implications for maintainability.</p>
                    <p><strong>ID Selectors (\`#myid\`):</strong></p>
                    <ul>
                        <li><strong>Uniqueness:</strong> An ID is meant to be used on only one element per page.</li>
                        <li><strong>High Specificity:</strong> Styles applied with IDs have very high specificity, making them hard to override with other CSS rules without using <code>!important</code>.</li>
                        <li><strong>Primary Use Case:</strong> Primarily for JavaScript hooks (to select a specific element) or for unique structural elements (like a main page container), not for general styling.</li>
                    </ul>
                    <p><strong>Class Selectors (\`.my-class\`):</strong></p>
                    <ul>
                        <li><strong>Reusability:</strong> A class can be applied to multiple elements on a page.</li>
                        <li><strong>Lower Specificity:</strong> Classes have lower specificity than IDs, making them easier to override and manage in the cascade.</li>
                        <li><strong>Primary Use Case:</strong> Ideal for applying reusable styles to various elements.</li>
                    </ul>
                    <p><strong>Why avoid overuse of ID selectors in CSS?</strong></p>
                    <ul>
                        <li>They make your CSS less flexible and harder to refactor.</li>
                        <li>Their high specificity leads to "specificity wars" and reliance on <code>!important</code>.</li>
                        <li>They prevent style reuse, as an ID should only appear once.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice (overusing ID for styling):</h4>
                    <pre class="code-example bad"><code>#myButton {
  background-color: blue;
  padding: 10px;
}
#anotherButton { /* Similar styles, repeated */
  background-color: blue;
  padding: 10px;
}</code></pre>
                    <h4>Good Practice (using classes for reusable styles):</h4>
                    <pre class="code-example good"><code>.btn-primary {
  background-color: blue;
  padding: 10px;
}

&lt;!-- In HTML --&gt;
&lt;button class="btn-primary"&gt;Button 1&lt;/button&gt;
&lt;button class="btn-primary"&gt;Button 2&lt;/button&gt;</code></pre>
                `
            }
        },
        {
            id: 'shorthand-property',
            type: 'Performance',
            severity: 'suggestion',
            title: 'Longhand CSS Property Usage',
            description: 'Using longhand CSS properties when a shorthand property is available can lead to more verbose stylesheets. Shorthand properties can make your CSS more concise and easier to read, and sometimes slightly improve parsing performance.',
            suggestion: 'Consider using shorthand CSS properties (e.g., `margin: 10px 20px;` instead of `margin-top: 10px; margin-right: 20px; ...`) where appropriate for conciseness and readability.',
            check: (code) => {
                const issues = [];
                const longhandMap = {
                    'margin-top': 'margin',
                    'margin-right': 'margin',
                    'margin-bottom': 'margin',
                    'margin-left': 'margin',
                    'padding-top': 'padding',
                    'padding-right': 'padding',
                    'padding-bottom': 'padding',
                    'padding-left': 'padding',
                    'border-top': 'border',
                    'border-right': 'border',
                    'border-bottom': 'border',
                    'border-left': 'border',
                    'background-color': 'background',
                    'background-image': 'background',
                    'background-repeat': 'background',
                    'background-position': 'background',
                    // Add more longhand properties as needed
                };

                for (const longhand in longhandMap) {
                    const regex = new RegExp(`${longhand}\\s*:`, 'g');
                    let match;
                    while ((match = regex.exec(code)) !== null) {
                        const lineNumber = code.substring(0, match.index).split('\n').length;
                        // Basic check to see if other longhands for the same shorthand might be nearby
                        const lineContent = code.split('\n')[lineNumber - 1];
                        let foundOtherLonghand = false;
                        for (const otherLonghand in longhandMap) {
                            if (longhandMap[otherLonghand] === longhandMap[longhand] && otherLonghand !== longhand && lineContent.includes(otherLonghand)) {
                                foundOtherLonghand = true;
                                break;
                            }
                        }

                        // Only suggest if at least two related longhands are on the same line/block or not clearly separated
                        // This is a very basic heuristic. A true parser would be better.
                        const context = code.substring(match.index, match.index + 200).split(';')[0]; // Look a bit forward
                        const otherRelatedProps = Object.keys(longhandMap).filter(key => longhandMap[key] === longhandMap[longhand] && key !== longhand);
                        let isShorthandCandidate = false;
                        if (foundOtherLonghand) { // if another longhand of the same group is on the same line, suggest shorthand
                            isShorthandCandidate = true;
                        } else {
                            // More advanced check: look for other properties in the same declaration block
                            // This is still limited without a full CSS parser.
                            const blockStart = code.lastIndexOf('{', match.index);
                            const blockEnd = code.indexOf('}', match.index);
                            if (blockStart !== -1 && blockEnd !== -1 && blockStart < match.index && match.index < blockEnd) {
                                const declarationBlock = code.substring(blockStart, blockEnd);
                                let countRelated = 0;
                                for (const prop of otherRelatedProps) {
                                    if (declarationBlock.includes(prop)) {
                                        countRelated++;
                                    }
                                }
                                if (countRelated > 0) {
                                    isShorthandCandidate = true;
                                }
                            }
                        }


                        if (isShorthandCandidate) {
                            issues.push({
                                lineNumber: lineNumber,
                                snippet: code.split('\n')[lineNumber - 1].trim(),
                                message: `Consider using the shorthand property '${longhandMap[longhand]}' instead of '${longhand}'.`,
                                ruleId: 'shorthand-property'
                            });
                        }
                    }
                }
                return issues;
            },
            learn: {
                title: 'Shorthand vs. Longhand CSS Properties',
                content: `
                    <p>CSS properties can often be written in two ways: longhand and shorthand. Longhand properties specify a single CSS value (e.g., <code>margin-top</code>, <code>background-color</code>), while shorthand properties allow you to set multiple related CSS properties in a single declaration (e.g., <code>margin</code>, <code>background</code>).</p>
                    <p><strong>Examples of Shorthand Properties:</strong></p>
                    <ul>
                        <li><code>margin</code>: combines <code>margin-top</code>, <code>margin-right</code>, <code>margin-bottom</code>, <code>margin-left</code></li>
                        <li><code>padding</code>: combines <code>padding-top</code>, <code>padding-right</code>, <code>padding-bottom</code>, <code>padding-left</code></li>
                        <li><code>border</code>: combines <code>border-width</code>, <code>border-style</code>, <code>border-color</code></li>
                        <li><code>background</code>: combines <code>background-color</code>, <code>background-image</code>, <code>background-repeat</code>, <code>background-position</code>, etc.</li>
                        <li><code>font</code>: combines <code>font-style</code>, <code>font-variant</code>, <code>font-weight</code>, <code>font-size</code>, <code>line-height</code>, <code>font-family</code></li>
                    </ul>
                    <p><strong>Advantages of Shorthand:</strong></p>
                    <ul>
                        <li><strong>Conciseness:</strong> Reduces the amount of CSS code you need to write.</li>
                        <li><strong>Readability:</strong> Can make your stylesheets cleaner and easier to understand at a glance.</li>
                        <li><strong>Efficiency:</strong> While minimal, it can sometimes lead to slightly faster parsing by the browser.</li>
                    </ul>
                    <p><strong>When to use Longhand:</strong></p>
                    <ul>
                        <li>When you only need to set a single property (e.g., just \`margin-top\`).</li>
                        <li>When you need to override only one specific sub-property of a shorthand without affecting others that might be set elsewhere.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice (using longhand):</h4>
                    <pre class="code-example bad"><code>.box {
  margin-top: 10px;
  margin-right: 20px;
  margin-bottom: 10px;
  margin-left: 20px;
  background-color: #f0f0f0;
  background-image: url('bg.png');
  background-repeat: no-repeat;
}</code></pre>
                    <h4>Good Practice (using shorthand):</h4>
                    <pre class="code-example good"><code>.box {
  margin: 10px 20px; /* Top/Bottom 10px, Left/Right 20px */
  background: #f0f0f0 url('bg.png') no-repeat;
}</code></pre>
                `
            }
        },
        {
            id: 'unitless-line-height',
            type: 'Best Practice',
            severity: 'suggestion',
            title: 'Unitless Line-Height Recommended',
            description: 'Using unitless values for `line-height` (e.g., `1.5` instead of `1.5em` or `150%`) is generally recommended. It allows the `line-height` to be inherited as a ratio, making it scale correctly with different `font-size` values.',
            suggestion: 'Change `line-height` values to be unitless numbers (e.g., `1.5`). This ensures proper scaling relative to the `font-size` of the element it applies to, and its descendants.',
            check: (code) => {
                const issues = [];
                const regex = /line-height:\s*(\d+(\.\d+)?)(px|em|rem|%)/g;
                let match;
                while ((match = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, match.index).split('\n').length;
                    issues.push({
                        lineNumber: lineNumber,
                        snippet: code.split('\n')[lineNumber - 1].trim(),
                        message: `Line-height with unit '${match[3]}' detected. Consider using a unitless value.`,
                        ruleId: 'unitless-line-height'
                    });
                }
                return issues;
            },
            learn: {
                title: 'Unitless Line-Height for Better Scalability',
                content: `
                    <p>When setting the <code>line-height</code> CSS property, you have several options for units (pixels, ems, percentages, etc.). However, using a <strong>unitless number</strong> (e.g., <code>1.5</code>) is generally the most robust and recommended approach.</p>
                    <p><strong>How different units behave:</strong></p>
                    <ul>
                        <li><strong>Unitless Number (e.g., \`1.5\`):</strong> The computed <code>line-height</code> for an element is this number multiplied by its own <code>font-size</code>. Critically, this *ratio* is inherited by child elements, so their <code>line-height</code> will be calculated based on *their own* <code>font-size</code>, making it scale correctly.</li>
                        <li><strong>\`em\` or \`rem\` (e.g., \`1.5em\`):</strong> The computed <code>line-height</code> is calculated for the *parent* element based on the parent's \`font-size\` and then inherited by children as a *fixed pixel value*. This can lead to disproportionate line spacing if child elements have different font sizes.</li>
                        <li><strong>\`px\` (e.g., \`24px\`):</strong> A fixed pixel value. Inherited as is, which can lead to text overlapping or too much space if \`font-size\` changes.</li>
                        <li><strong>\`%\` (e.g., \`150%\`):</strong> Behaves similarly to \`em\` in terms of inheritance; the percentage is calculated based on the parent's \`font-size\` and then inherited as a fixed pixel value.</li>
                    </ul>
                    <p><strong>Why prefer unitless \`line-height\`?</strong></p>
                    <ul>
                        <li><strong>Scalability:</strong> Ensures consistent and correct line spacing when text size changes (e.g., in responsive designs, or when users change browser font settings).</li>
                        <li><strong>Predictability:</strong> Avoids unexpected spacing issues in nested elements.</li>
                    </ul>
                    <p><strong>Example:</strong></p>
                    <h4>Bad Practice (using \`em\` for line-height):</h4>
                    <pre class="code-example bad"><code>body {
  font-size: 16px;
  line-height: 1.5em; /* Calculates to 24px for body */
}
h1 {
  font-size: 32px;
  /* Inherits 24px, not 1.5 times its own 32px. Could be too small. */
}</code></pre>
                    <h4>Good Practice (using unitless line-height):</h4>
                    <pre class="code-example good"><code>body {
  font-size: 16px;
  line-height: 1.5; /* Inherits as a ratio */
}
h1 {
  font-size: 32px;
  /* Inherits 1.5, so its line-height becomes 1.5 * 32px = 48px. Correct! */
}</code></pre>
                `
            }
        },
        {
            id: 'css-unknown-property',
            type: 'Error',
            severity: 'error',
            title: 'Unknown CSS Property Name',
            description: 'A CSS property name appears to be invalid (e.g., colr instead of color).',
            suggestion: 'Use valid CSS property names. Check for typos like color, background-color, etc.',
            check: (code) => {
                const issues = [];
                const known = new Set(['color', 'background', 'background-color', 'background-image', 'background-repeat', 'background-position', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'display', 'position', 'top', 'right', 'bottom', 'left', 'float', 'clear', 'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height', 'font', 'font-size', 'font-weight', 'font-family', 'line-height', 'text-align', 'text-decoration', 'text-transform', 'letter-spacing', 'word-spacing', 'white-space', 'overflow', 'overflow-x', 'overflow-y', 'z-index', 'opacity', 'visibility', 'box-shadow', 'text-shadow', 'cursor', 'flex', 'flex-direction', 'justify-content', 'align-items', 'align-content', 'gap', 'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap']);
                const blockRegex = /\{([^}]*)\}/g;
                let bm;
                while ((bm = blockRegex.exec(code)) !== null) {
                    const start = code.lastIndexOf('{', bm.index);
                    const lineNumber = code.substring(0, start).split('\n').length;
                    const decls = bm[1];
                    const propRegex = /([a-z-]+)\s*:/g;
                    let pm;
                    while ((pm = propRegex.exec(decls)) !== null) {
                        const prop = pm[1];
                        if (!known.has(prop)) {
                            issues.push({ lineNumber, snippet: code.split('\n')[lineNumber - 1].trim(), message: `Unknown CSS property '${prop}'.`, ruleId: 'css-unknown-property' });
                        }
                    }
                }
                return issues;
            }
        },
        {
            id: 'css-equals-instead-of-colon',
            type: 'Error',
            severity: 'error',
            title: 'Using = Instead of : in CSS Declaration',
            description: 'CSS uses colon to assign values (color: red), not equals (color = red).',
            suggestion: 'Replace = with : in CSS property declarations.',
            check: (code) => {
                const issues = [];
                const regex = /\b[a-z-]+\s*=\s*[^;{}]+;/g;
                let m;
                while ((m = regex.exec(code)) !== null) {
                    const lineNumber = code.substring(0, m.index).split('\n').length;
                    issues.push({ lineNumber, snippet: code.split('\n')[lineNumber - 1].trim(), message: 'Use : instead of = in CSS declarations.', ruleId: 'css-equals-instead-of-colon' });
                }
                return issues;
            }
        },
        {
            id: 'css-selector-missing-dot-hash',
            type: 'Best Practice',
            severity: 'warning',
            title: 'Selector May Be Missing . or #',
            description: 'A bare selector like box { } might be intended as a class (.box) or id (#box).',
            suggestion: 'If targeting a class or id, prefix with . or #. Otherwise ensure it is a valid element selector.',
            check: (code) => {
                const issues = [];
                const knownTags = new Set(['html', 'body', 'div', 'span', 'p', 'a', 'ul', 'ol', 'li', 'nav', 'header', 'footer', 'main', 'section', 'article', 'aside', 'img', 'button', 'input', 'textarea', 'select', 'label', 'form', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'small', 'strong', 'em', 'figure', 'figcaption', 'canvas', 'svg', 'video', 'audio', 'source', 'link', 'meta', 'script', 'style']);
                const selRegex = /([^{}]+)\{/g;
                let m;
                while ((m = selRegex.exec(code)) !== null) {
                    const raw = m[1].trim();
                    const first = raw.split(',')[0].trim();
                    if (/^[a-z][a-z0-9-]*$/.test(first) && !knownTags.has(first)) {
                        const lineNumber = code.substring(0, m.index).split('\n').length;
                        issues.push({ lineNumber, snippet: code.split('\n')[lineNumber - 1].trim(), message: `Selector '${first}' may be missing '.' or '#'.`, ruleId: 'css-selector-missing-dot-hash' });
                    }
                }
                return issues;
            }
        },
        {
            id: 'css-conflicting-overrides',
            type: 'Maintainability',
            severity: 'warning',
            title: 'Later Rule Overrides Earlier Rule',
            description: 'Same selector redefined later with different values can unintentionally override earlier styles.',
            suggestion: 'Consolidate declarations or ensure the order is intentional.',
            check: (code) => {
                const issues = [];
                const blockRegex = /([^{}]+)\{([^}]*)\}/g;
                const seen = new Map(); // selector -> { prop -> {value, line} }
                let m;
                while ((m = blockRegex.exec(code)) !== null) {
                    const selector = m[1].trim();
                    const start = code.substring(0, m.index).lastIndexOf('{');
                    const lineNumber = code.substring(0, start).split('\n').length;
                    const decls = m[2];
                    const propRegex = /([a-z-]+)\s*:\s*([^;]+);/g;
                    let pm;
                    const map = seen.get(selector) || new Map();
                    while ((pm = propRegex.exec(decls)) !== null) {
                        const prop = pm[1];
                        const val = pm[2].trim();
                        if (map.has(prop) && map.get(prop).value !== val) {
                            issues.push({ lineNumber, snippet: code.split('\n')[lineNumber - 1].trim(), message: `Selector '${selector}' overrides '${prop}' (new: ${val}, old: ${map.get(prop).value}).`, ruleId: 'css-conflicting-overrides' });
                        }
                        map.set(prop, { value: val, line: lineNumber });
                    }
                    seen.set(selector, map);
                }
                return issues;
            }
        }
    ]
};

export { analysisRules };