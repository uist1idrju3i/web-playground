export function calculate(expression) {
  const tokens = String(expression).match(/\d+(?:\.\d+)?|[()+\-*/]/gu) ?? [];
  const compactInput = String(expression).replace(/\s/gu, '');
  if (!tokens.length || tokens.join('') !== compactInput)
    throw new SyntaxError('Only numbers and + - * / parentheses are allowed.');
  let cursor = 0;
  const peek = () => tokens[cursor];
  const consume = () => tokens[cursor++];

  function primary() {
    if (peek() === '-') {
      consume();
      return -primary();
    }
    if (peek() === '+') {
      consume();
      return primary();
    }
    if (peek() === '(') {
      consume();
      const value = sum();
      if (consume() !== ')') throw new SyntaxError('Unclosed parenthesis.');
      return value;
    }
    const token = consume();
    if (!/^\d+(?:\.\d+)?$/u.test(token ?? '')) throw new SyntaxError('Expected a number.');
    return Number(token);
  }
  function product() {
    let value = primary();
    while (peek() === '*' || peek() === '/') {
      const operator = consume();
      const right = primary();
      if (operator === '/' && right === 0) throw new RangeError('Division by zero.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = consume();
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = sum();
  if (cursor !== tokens.length || !Number.isFinite(result))
    throw new SyntaxError('Invalid arithmetic expression.');
  return result;
}
