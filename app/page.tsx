import WorkflowBuilder from "@/components/workflow-builder"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1">
        <WorkflowBuilder />
      </div>
    </main>
  )
}
