import { Badge } from '@app/ui/components/ui/badge'
import { Button } from '@app/ui/components/ui/button'

export const App = () => {
  return (
    <main className='h-screen grid justify-items-center content-center gap-4'>
      <Badge variant='secondary'>Vite+ template</Badge>
      <Button>Website</Button>
    </main>
  )
}
