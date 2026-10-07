import Markdown from "react-markdown"
import remarkBreaks from "remark-breaks"

export function PostBody({ body, poem }: { body: string; poem: boolean }) {
  return (
    <div className={poem ? "reading-body reading-poem" : "reading-body"}>
      <Markdown skipHtml remarkPlugins={poem ? [remarkBreaks] : []}
        components={{ img: ({ alt }) => <span>{alt ?? ""}</span> }}>
        {body}
      </Markdown>
    </div>
  )
}
