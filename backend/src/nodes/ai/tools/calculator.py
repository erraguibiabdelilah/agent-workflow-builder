"""Small arithmetic expression parser used by the calculator tool."""
import ast
import operator
import math
from typing import Any

from ....lib.errors import NodeError, NodeErrorType

_BINARY_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
}
_UNARY_OPERATORS = {ast.UAdd: operator.pos, ast.USub: operator.neg}


def calculate(expression: Any) -> float | int:
    """Evaluate basic arithmetic without evaluating Python code."""
    if not isinstance(expression, str) or not expression.strip() or len(expression) > 256:
        raise NodeError("Saisissez une expression arithmétique valide.", NodeErrorType.TOOL)
    try:
        parsed = ast.parse(expression, mode="eval")
        result = _evaluate(parsed.body, 0)
        if not math.isfinite(float(result)) or abs(result) > 1e100:
            raise ValueError("numeric result out of range")
        return result
    except (SyntaxError, TypeError, ValueError, ZeroDivisionError, OverflowError) as error:
        raise NodeError("Impossible de calculer cette expression.", NodeErrorType.TOOL, cause=error) from error


def _evaluate(node: ast.AST, depth: int) -> float | int:
    if depth > 32:
        raise ValueError("expression too deep")
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPERATORS:
        return _UNARY_OPERATORS[type(node.op)](_evaluate(node.operand, depth + 1))
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPERATORS:
        left = _evaluate(node.left, depth + 1)
        right = _evaluate(node.right, depth + 1)
        if isinstance(node.op, ast.Pow) and abs(right) > 1000:
            raise ValueError("exponent too large")
        return _BINARY_OPERATORS[type(node.op)](left, right)
    raise ValueError("unsupported arithmetic syntax")
