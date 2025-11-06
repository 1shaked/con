import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { IfcTest } from "./components/ifctest"
// import { IfcViewer } from "./components/ifcviewr"
const queryClient = new QueryClient()

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-full">
        <IfcTest />
      </div>
    </QueryClientProvider>
  )
}

export default App
