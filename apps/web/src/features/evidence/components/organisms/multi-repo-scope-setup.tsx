import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, TrashIcon, BoxIcon, Edit2Icon, SaveIcon, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useArchitectureScopeQuery, 
  useSaveArchitectureScopeMutation 
} from "../../../../lib/api/assessment-queries";
import { useAuthRepositoriesQuery } from "../../../../lib/api/auth-queries";
import { toast } from "sonner";
import { REPOSITORY_CONNECTION_STATUSES } from "@lcsp/contracts/github-integration";

type RepoScope = {
  id: string;
  name: string;
  declaration: string;
};

export function MultiRepoScopeSetup({ assessmentId }: { assessmentId: string }) {
  const [globalDeclaration, setGlobalDeclaration] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<RepoScope[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [repoToAdd, setRepoToAdd] = useState("");

  const repositoriesQuery = useAuthRepositoriesQuery();
  const availableRepos = (repositoriesQuery.data ?? []).filter(
    (repository) =>
      repository.status === REPOSITORY_CONNECTION_STATUSES.active &&
      repository.revoked_at === null,
  );
  const isLoadingRepos = repositoriesQuery.isLoading;

  const { data: scopeData, isLoading: isLoadingScope } = useArchitectureScopeQuery(assessmentId);
  const saveMutation = useSaveArchitectureScopeMutation(assessmentId);

  // Sync from server whenever scopeData arrives or changes (initial load + post-save refetch)
  useEffect(() => {
    if (scopeData != null) {
      setGlobalDeclaration(scopeData.globalDeclaration || "");
      setSelectedRepos(
        (scopeData.repositories ?? []).map((r: any) => ({
          id: r.connectionId,
          name: r.fullName || r.name || r.connectionId,
          declaration: r.declaration || "",
        }))
      );
    }
  }, [scopeData]);

  const handleAddRepo = () => {
    if (!repoToAdd || !availableRepos) return;
    const repoInfo = availableRepos.find((r: any) => r.id === repoToAdd);
    if (!repoInfo) return;
    
    // Check if already exists
    if (selectedRepos.some((r: RepoScope) => r.id === repoToAdd)) {
      setIsAdding(false);
      setRepoToAdd("");
      return;
    }

    setSelectedRepos([...selectedRepos, {
      id: repoInfo.id,
      name: repoInfo.repository_full_name,
      declaration: ""
    }]);
    setIsAdding(false);
    setRepoToAdd("");
  };

  const handleRemoveRepo = (id: string) => {
    setSelectedRepos(selectedRepos.filter(r => r.id !== id));
  };

  const handleUpdateRepoDeclaration = (id: string, newDeclaration: string) => {
    setSelectedRepos(selectedRepos.map(r => 
      r.id === id ? { ...r, declaration: newDeclaration } : r
    ));
  };

  const handleSave = () => {
    saveMutation.mutate({
      globalDeclaration,
      repositories: selectedRepos.map(r => ({
        connectionId: r.id,
        declaration: r.declaration
      }))
    }, {
      onSuccess: () => {
        toast.success("Architecture scope saved successfully");
      },
      onError: () => {
        toast.error("Failed to save architecture scope");
      }
    });
  };

  if (isLoadingScope || isLoadingRepos) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border bg-zinc-50/50">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* GLOBAL DECLARATION */}
      <div className="flex flex-col gap-3 rounded-lg border bg-zinc-50/50 p-4">
        <div className="flex items-center gap-2">
          <Edit2Icon className="size-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Global Technical Declaration</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe your system architecture to assist the reconciliation engine. For example, specify how different repositories interact (e.g. "payment-service calls auth-service via HTTP").
        </p>
        <Textarea 
          value={globalDeclaration}
          onChange={(e) => setGlobalDeclaration(e.target.value)}
          placeholder="e.g. The payment-service communicates with the auth-service via gRPC."
          className="min-h-[100px] resize-none bg-white"
        />
      </div>

      {/* REPOSITORY SCOPE */}
      <div className="flex flex-col gap-3 rounded-lg border bg-zinc-50/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Included Repositories</h3>
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <PlusIcon className="mr-2 size-4" />
            Add Repository
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Select repositories from this workspace to include in the evidence graph scan.
        </p>
        
        {isAdding && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 p-3 border rounded-md bg-white">
            <div className="flex-1">
              <Select 
                value={repoToAdd}
                onValueChange={(value) => setRepoToAdd(value ?? "")}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select a repository..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRepos?.filter((r: any) => !selectedRepos.some((sr: RepoScope) => sr.id === r.id)).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.repository_full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddRepo}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {selectedRepos.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-md bg-white text-center">
            <p className="text-sm text-muted-foreground">No repositories selected.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {selectedRepos.map(repo => (
              <div key={repo.id} className="flex flex-col gap-3 p-4 border rounded-md bg-white shadow-sm">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <BoxIcon className="size-4" />
                    {repo.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveRepo(repo.id)}>
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repo-specific Declaration</span>
                  <Textarea 
                    value={repo.declaration}
                    onChange={(e) => handleUpdateRepoDeclaration(repo.id, e.target.value)}
                    placeholder="e.g. Scan only /src, ignore /tests. Framework is NestJS."
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t pt-4">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <SaveIcon className="mr-2 size-4" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
