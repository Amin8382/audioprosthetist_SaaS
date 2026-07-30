import EmptyState from './EmptyState'

type ActorRequiredStateProps = {
  title: string
  message: string
}

export default function ActorRequiredState({ title, message }: ActorRequiredStateProps) {
  return <EmptyState title={title} message={message} />
}
