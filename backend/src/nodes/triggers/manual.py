"""Manual trigger node."""
from typing import List

from ..types import (
    ExecuteContext,
    Item,
    NodeDefinition,
    NodeTypeDescription,
    NodeCategory,
    NodeKind,
    PropertyType,
    OutputPort,
    ConnectionType,
    NodeProperty,
)


class ManualTriggerNode(NodeDefinition):
    """Manual trigger for starting workflows."""
    
    @property
    def description(self) -> NodeTypeDescription:
        return NodeTypeDescription(
            type="manualTrigger",
            version=1,
            display_name="Manual Trigger",
            description="Démarre le workflow manuellement",
            category=NodeCategory.TRIGGER,
            kind=NodeKind.TRIGGER,
            icon="mouse-pointer-click",
            color="var(--text-muted)",
            inputs=[],
            outputs=[OutputPort(type=ConnectionType.MAIN, display_name="Sortie")],
            properties=[
                NodeProperty(
                    name="testData",
                    display_name="Données de test",
                    type=PropertyType.JSON,
                    default={"text": "Bonjour"},
                    description="Données à injecter lors de l'exécution manuelle",
                )
            ],
        )
    
    async def execute(self, ctx: ExecuteContext) -> List[List[Item]]:
        """Execute manual trigger."""
        # The execution API supplies initial items; keep their values unchanged.
        if ctx.items:
            return [ctx.items]

        # Also support direct invocation with the configured test data.
        test_data = ctx.get_param("testData")

        if isinstance(test_data, list):
            items = [
                item if isinstance(item, Item)
                else Item(data=item if isinstance(item, dict) else {"data": item})
                for item in test_data
            ]
        elif isinstance(test_data, dict):
            items = [Item(data=test_data)]
        else:
            items = [Item(data={"text": "Bonjour"})]
        
        return [items]


# Export the node
manual_trigger_node = ManualTriggerNode()
