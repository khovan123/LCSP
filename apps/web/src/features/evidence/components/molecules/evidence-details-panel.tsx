import { XIcon, FileCodeIcon, CheckCircleIcon, AlertTriangleIcon, HelpCircleIcon } from "lucide-react";
import { RECONCILIATION_STATUSES, type GraphNodeDto } from "@lcsp/contracts/evidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EvidenceDetailsPanelProps {
  node: GraphNodeDto;
  onClose: () => void;
}

export function EvidenceDetailsPanel({ node, onClose }: EvidenceDetailsPanelProps) {
  const getStatusDisplay = () => {
    switch (node.reconciliationStatus) {
      case RECONCILIATION_STATUSES.confirmed:
        return {
          icon: <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />,
          label: "Confirmed",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case RECONCILIATION_STATUSES.missingInObserved:
        return {
          icon: <AlertTriangleIcon className="w-4 h-4 text-red-500 mr-2" />,
          label: "Missing in Code",
          color: "bg-red-100 text-red-800 border-red-200"
        };
      case RECONCILIATION_STATUSES.orphanedInObserved:
        return {
          icon: <AlertTriangleIcon className="w-4 h-4 text-orange-500 mr-2" />,
          label: "Orphaned / Undocumented",
          color: "bg-orange-100 text-orange-800 border-orange-200"
        };
      case RECONCILIATION_STATUSES.conflict:
        return {
          icon: <AlertTriangleIcon className="w-4 h-4 text-yellow-500 mr-2" />,
          label: "Conflict",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      default:
        return {
          icon: <HelpCircleIcon className="w-4 h-4 text-gray-500 mr-2" />,
          label: "Unknown / Unreconciled",
          color: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const status = getStatusDisplay();

  // In a real implementation, we would query IntegrationEvidence for this node
  // For now, we display the properties
  const properties = node.properties || {};

  return (
    <div className="flex flex-col h-full bg-white text-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg text-gray-900 truncate pr-2">Node Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full flex-shrink-0">
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canonical Name</h4>
          <p className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded border break-all">
            {node.canonicalName}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</h4>
            <Badge variant="outline">{node.type}</Badge>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Source</h4>
            <Badge variant="secondary">{node.source}</Badge>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reconciliation Status</h4>
          <div className={`flex items-center p-2 rounded border ${status.color}`}>
            {status.icon}
            <span className="font-medium">{status.label}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detected Properties</h4>
          {Object.keys(properties).length > 0 ? (
            <div className="bg-zinc-50 border rounded p-3 space-y-2">
              {Object.entries(properties).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs font-medium text-gray-500">{key}</span>
                  <span className="font-mono text-xs text-gray-800 break-words">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-xs">No additional properties detected.</p>
          )}
        </div>

        {/* Mock Evidence Listing for Visualization Phase */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Integration Evidences</h4>
          {node.source === "OBSERVED" ? (
            <div className="space-y-2">
              <div className="flex items-start p-2 border rounded bg-zinc-50">
                <FileCodeIcon className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-800 truncate" title="src/modules/example.ts">
                    src/modules/example.ts
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Lines: 12-45</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic text-xs">No physical evidence. This node was declared in architecture specs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
