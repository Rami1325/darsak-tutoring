export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is generated server-side from our own records.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
