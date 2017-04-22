// Configured for ESLint 3.19.0

'use strict';

module.exports = {

  /**
   * Allowed JavaScript environments
   */

  env: {

    // browser global variables
    'browser': true,
    // jQuery global variables
    'jquery': true,
    // Node.js global variables and Node.js scoping
    'node': true

  },

  /**
   * Enabled ESLint rules
   */

  rules: {

    /**
     * Possible Errors
     */

    // disallow assignment operators in conditional expressions
    'no-cond-assign': ['error', 'always'],
    // disallow the use of console
    'no-console': ['error'],
    // disallow the use of debugger
    'no-debugger': ['error'],
    // disallow duplicate arguments in function definitions
    'no-dupe-args': ['error'],
    // disallow duplicate keys in object literals
    'no-dupe-keys': ['error'],
    // disallow empty character classes in regular expressions
    'no-empty-character-class': ['error'],
    // disallow empty block statements
    'no-empty': ['error'],
    // disallow unnecessary semicolons
    'no-extra-semi': ['error'],
    // disallow variable or function declarations in nested blocks
    'no-inner-declarations': ['error', 'functions'],
    // disallow invalid regular expression strings in RegExp constructors
    'no-invalid-regexp': ['error'],
    // disallow irregular whitespace outside of strings and comments
    'no-irregular-whitespace': ['error'],
    // disallow labeled statements
    'no-labels': ['error'],
    // disallow calling global object properties as functions
    'no-obj-calls': ['error'],
    // disallow calling some Object.prototype methods directly on objects
    'no-prototype-builtins': ['error'],
    // disallow multiple spaces in regular expressions
    'no-regex-spaces': ['error'],
    // disallow sparse arrays
    'no-sparse-arrays': ['error'],
    // disallow confusing multiline expressions
    'no-unexpected-multiline': ['error'],
    // disallow unreachable code after return, throw, continue, and break
    // statements
    'no-unreachable': ['error'],
    // disallow control flow statements in finally blocks
    'no-unsafe-finally': ['error'],
    // require calls to isNaN() when checking for NaN
    'use-isnan': ['error'],
    // enforce comparing typeof expressions against valid strings
    'valid-typeof': ['error'],

    /**
     * Best Practices
     */
    // enforce getter and setter pairs in objects
    'accessor-pairs': ['error'],
    // enforce return statements in callbacks of array methods
    'array-callback-return': ['error'],
    // enforce the use of variables within the scope they are defined
    'block-scoped-var': ['error'],
    // enforce consistent brace style for all control statements
    'curly': ['error', 'all'],
    // enforce consistent newlines before and after dots
    'dot-location': ['error', 'property'],
    // enforce dot notation whenever possible
    'dot-notation': ['error'],
    // require the use of === and !==
    'eqeqeq': ['error', 'always'],
    // require for-in loops to include an if statement
    'guard-for-in': ['error'],
    // disallow the use of arguments.caller or arguments.callee
    'no-caller': ['error'],
    // disallow division operators explicitly at the beginning of regular
    // expressions
    'no-div-regex': ['error'],
    // disallow empty functions
    'no-empty-function': ['error'],
    // disallow the use of eval
    'no-eval': ['error'],
    // disallow extending native types
    'no-extend-native': ['error'],
    // disallow leading or trailing decimal points in numeric literals
    'no-floating-decimal': ['error'],
    // disallow assignments to native objects or read-only global variables
    'no-global-assign': ['error'],
    // disallow shorthand type conversions
    'no-implicit-coercion': ['error'],
    // disallow variable and function declarations in the global scope
    'no-implicit-globals': ['error'],
    // disallow the use of eval()-like methods
    'no-implied-eval': ['error'],
    // disallow function declarations and expressions inside loop statements
    'no-loop-func': ['error'],
    // disallow multiple spaces
    'no-multi-spaces': ['error'],
    // disallow multiline strings
    'no-multi-str': ['error'],
    // disallow new operators with the Function object
    'no-new-func': ['error'],
    // disallow new operators with the String, Number, and Boolean objects
    'no-new-wrappers': ['error'],
    // disallow new operators outside of assignments or comparisons
    'no-new': ['error'],
    // disallow octal literals
    'no-octal': ['error'],
    // disallow the use of the __proto__ property
    'no-proto': ['error'],
    // disallow variable redeclaration
    'no-redeclare': ['error', {'builtinGlobals': true}],
    // disallow assignment operators in return statements
    'no-return-assign': ['error', 'always'],
    // disallow assignments where both sides are exactly the same
    'no-self-assign': ['error'],
    // disallow comparisons where both sides are exactly the same
    'no-self-compare': ['error'],
    // disallow comma operators
    'no-sequences': ['error'],
    // disallow unmodified loop conditions
    'no-unmodified-loop-condition': ['error'],
    // disallow unnecessary calls to .call() and .apply()
    'no-useless-call': ['error'],
    // disallow redundant return statements
    'no-useless-return': ['error'],
    // disallow with statements
    'no-with': ['error'],
    // enforce the consistent use of the radix argument when using parseInt()
    'radix': ['error'],

    /**
     * Strict Mode
     */

    'strict': ['error', 'function'],

    /**
     * Variables
     */

    // disallow deleting variables
    'no-delete-var': ['error'],
    // disallow specified global variables
    'no-restricted-globals': ['error', 'event'],
    // disallow initializing variables to undefined
    'no-undef-init': ['error'],
    // disallow the use of undeclared variables unless mentioned in /*global */
    // comments
    'no-undef': ['error'],
    // disallow unused variables
    'no-unused-vars': ['error'],
    // disallow the use of variables before they are defined
    'no-use-before-define': ['error', {'functions': false}],

    /**
     * Stylistic Issues
     */

    //  enforce consistent spacing inside single-line blocks
    'block-spacing': ['error', 'never'],
    // enforce consistent brace style for blocks
    'brace-style': ['error', '1tbs', {'allowSingleLine': false}],
    // require or disallow trailing commas
    "comma-dangle": ["error", "never"],
    // enforce consistent spacing before and after commas
    'comma-spacing': ['error'],
    // enforce consistent comma style
    'comma-style': ['error', 'last'],
    // require or disallow spacing between function identifiers and their
    // invocations
    'func-call-spacing': ['error', 'never'],
    // enforce consistent spacing between keys and values in object literal
    // properties
    'key-spacing': ['error', {'beforeColon': false, 'afterColon': true}],
    // enforce consistent spacing before and after keywords
    'keyword-spacing': ['error', {'before': true, 'after': true}],
    // enforce a maximum number of statements allowed per line
    'max-statements-per-line': ['error', {'max': 1}],
    // require parentheses when invoking a constructor with no arguments
    'new-parens': ['error'],
    // disallow bitwise operators
    'no-bitwise': ['error'],
    // disallow mixed binary operators
    'no-mixed-operators': ['error'],
    // disallow mixed spaces and tabs for indentation
    'no-mixed-spaces-and-tabs': ['error'],
    // disallow the unary operators ++ and --
    'no-plusplus': ['error'],
    // disallow whitespace before properties
    'no-whitespace-before-property': ['error'],
    // enforce consistent spacing inside braces
    'object-curly-spacing': ['error', 'never'],
    // enforce the consistent use of either backticks, double, or single quotes
    'quotes': ['error', 'single'],
    // require or disallow semicolons instead of ASI
    'semi': ['error', 'always'],
    // enforce consistent spacing before blocks
    'space-before-blocks': ['error', 'always'],
    // enforce consistent spacing before function definition opening parenthesis
    'space-before-function-paren': ['error', {'anonymous': 'always', 'named': 'never'}],
    // enforce consistent spacing inside parentheses
    'space-in-parens': ['error', 'never'],
    // require spacing around infix operators
    'space-infix-ops': ['error'],
    // enforce consistent spacing before or after unary operators
    'space-unary-ops': ['error', {'words': true, 'nonwords': false}],
    // enforce consistent spacing after the // or /* in a comment
    'spaced-comment': ['error', 'always']

  }
};
