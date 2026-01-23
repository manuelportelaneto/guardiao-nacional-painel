
import React, { useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

interface Entity {
    id: string;
    type: string;
    role?: string;
    influence_level?: 'CENTRAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Relation {
    source: string;
    target: string;
    relation: string;
}

interface GraphData {
    entities: Entity[];
    relations: Relation[];
}

const IntelGraph: React.FC<{
    data: GraphData,
    onNodeClick?: (node: any) => void,
    cooldownTicks?: number,
    onEngineStop?: () => void
}> = ({ data, onNodeClick, cooldownTicks, onEngineStop }) => {
    // Transform data for react-force-graph
    const graphData = useMemo(() => {
        if (!data || !data.entities) return { nodes: [], links: [] };

        const nodes = data.entities.map(e => {
            let val = 5;
            if (e.influence_level === 'CENTRAL') val = 30;
            else if (e.influence_level === 'HIGH') val = 20;
            else if (e.influence_level === 'MEDIUM') val = 10;

            return {
                ...e,
                val,
                color: e.type === 'PERSON' ? '#3b82f6' :
                    e.type === 'ORGANIZATION' ? '#8b5cf6' :
                        e.type === 'EVENT' ? '#f97316' : '#10b981'
            };
        });

        const links = data.relations.map(r => ({
            source: r.source,
            target: r.target,
            name: r.relation,
            color: '#475569'
        }));

        return { nodes, links };
    }, [data]);

    return (
        <div style={{ height: '600px', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
            <ForceGraph2D
                graphData={graphData}
                onNodeClick={(node) => onNodeClick && onNodeClick(node)}
                cooldownTicks={cooldownTicks}
                onEngineStop={onEngineStop}
                nodeLabel="role" // Hover text

                // Rich Node Rendering
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12 / globalScale;
                    const radius = node.val ? Math.max(node.val / 2, 2) : 5;

                    // Draw Node Circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color || '#94a3b8';
                    ctx.fill();

                    // Draw Border (Selection/Highlight implication)
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1 / globalScale;
                    ctx.stroke();

                    // Draw Label (Always Visible)
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White text
                    ctx.fillText(label, node.x, node.y + radius + fontSize);

                    // Draw Role (Smaller, below label)
                    if (node.role && globalScale > 1) { // Only show role when zoomed in a bit
                        ctx.font = `${fontSize * 0.8}px Sans-Serif`;
                        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
                        ctx.fillText(node.role, node.x, node.y + radius + (fontSize * 2));
                    }
                }}

                // Link Rendering
                linkColor="color"
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkWidth={1}
                backgroundColor="#0f172a"
            />
        </div>
    );
};

export default IntelGraph;
