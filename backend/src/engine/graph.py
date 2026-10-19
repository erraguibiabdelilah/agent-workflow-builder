"""Workflow graph analysis and execution planning."""
from typing import Dict, List, Any, Set, Optional, NamedTuple
from dataclasses import dataclass

class NodeExecution(NamedTuple):
    """Represents a node execution with its input data."""
    node_id: str
    input_data: List[Dict[str, Any]]
    connection_type: str
    connection_index: int

@dataclass
class WorkflowGraph:
    """Analyzes workflow structure for execution planning."""
    
    def __init__(self, workflow_definition: Dict[str, Any]):
        self.workflow = workflow_definition
        self.nodes = {node["name"]: node for node in workflow_definition.get("nodes", [])}
        self.connections = workflow_definition.get("connections", {})
        
    def get_node(self, node_name: str) -> Dict[str, Any]:
        """Get node by name."""
        node = self.nodes.get(node_name)
        if not node:
            raise ValueError(f"Node '{node_name}' not found")
        return node
    
    def get_trigger_nodes(self) -> List[str]:
        """Find all trigger nodes in the workflow."""
        trigger_nodes = []
        for node in self.workflow.get("nodes", []):
            if node.get("type", "").endswith("Trigger") or node.get("type") == "manualTrigger":
                trigger_nodes.append(node["name"])
        return trigger_nodes
    
    def get_dependent_executions(
        self, 
        source_node: str, 
        outputs: List[List[Dict[str, Any]]]
    ) -> List[NodeExecution]:
        """
        Get all dependent node executions from a source node's outputs.
        """
        executions = []
        
        # Get connections from this node
        node_connections = self.connections.get(source_node, {})
        
        for connection_type, type_connections in node_connections.items():
            for output_index, connections_list in enumerate(type_connections):
                if output_index < len(outputs):
                    output_data = outputs[output_index]
                    
                    for connection in connections_list:
                        target_node = connection["node"]
                        target_type = connection["type"]
                        target_index = connection["index"]
                        
                        # Only create executions for main connections
                        # Subnodes are handled differently
                        if target_type == "main":
                            executions.append(NodeExecution(
                                node_id=target_node,
                                input_data=output_data,
                                connection_type=target_type,
                                connection_index=target_index
                            ))
        
        return executions
    
    def get_connected_subnodes(self, node_name: str, connection_type: str) -> List[str]:
        """Get all subnodes connected to a node via a specific connection type."""
        subnodes = []
        
        # Look through all connections to find ones targeting this node
        for source_node, connections in self.connections.items():
            type_connections = connections.get(connection_type, [])
            for connections_list in type_connections:
                for connection in connections_list:
                    if connection["node"] == node_name and connection["type"] == connection_type:
                        subnodes.append(source_node)
        
        return subnodes
    
    def validate_workflow(self) -> List[str]:
        """Validate workflow structure and return list of errors."""
        errors = []

        # Main-flow cycles are not executable at the MVP. Ignore ai_* links:
        # they connect sub-nodes and are resolved by the agent at runtime.
        main_graph: Dict[str, List[str]] = {name: [] for name in self.nodes}
        for source, type_connections in self.connections.items():
            for output in type_connections.get("main", []):
                for connection in output:
                    target = connection.get("node")
                    if target in self.nodes:
                        main_graph.setdefault(source, []).append(target)

        visiting: Set[str] = set()
        visited: Set[str] = set()

        def visit(node_name: str) -> bool:
            if node_name in visiting:
                return True
            if node_name in visited:
                return False
            visiting.add(node_name)
            if any(visit(target) for target in main_graph.get(node_name, [])):
                return True
            visiting.remove(node_name)
            visited.add(node_name)
            return False

        if any(visit(node_name) for node_name in main_graph):
            errors.append("Le workflow contient un cycle dans les connexions principales")
        
        # Check for orphaned nodes (except triggers)
        trigger_nodes = self.get_trigger_nodes()
        reachable_nodes = set(trigger_nodes)
        
        # Find all reachable nodes
        queue = trigger_nodes[:]
        while queue:
            current = queue.pop(0)
            node_connections = self.connections.get(current, {})
            
            for type_connections in node_connections.values():
                for connections_list in type_connections:
                    for connection in connections_list:
                        target = connection["node"]
                        if target not in reachable_nodes:
                            reachable_nodes.add(target)
                            queue.append(target)
        
        # Check for unreachable nodes
        all_nodes = set(self.nodes.keys())
        unreachable = all_nodes - reachable_nodes
        for node in unreachable:
            node_obj = self.nodes[node]
            # Skip trigger nodes and subnodes
            if not node_obj.get("type", "").endswith("Trigger") and node_obj.get("type") != "manualTrigger":
                from ..nodes.registry import get_node_definition, get_node_kind
                node_def = get_node_definition(node_obj["type"])
                if node_def and get_node_kind(node_def) != "subnode":
                    errors.append(f"Node '{node}' is not reachable from any trigger")
        
        # Validate connections
        for source_node, connections in self.connections.items():
            if source_node not in self.nodes:
                errors.append(f"Connection source '{source_node}' does not exist")
                continue
                
            for connection_type, type_connections in connections.items():
                for output_index, connections_list in enumerate(type_connections):
                    for connection in connections_list:
                        target_node = connection["node"]
                        target_type = connection["type"]
                        target_index = connection["index"]
                        
                        if target_node not in self.nodes:
                            errors.append(f"Connection target '{target_node}' does not exist")
        
        return errors
