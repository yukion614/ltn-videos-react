type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

export default function JsonLd({ data }: { data: JsonLdData }) {
  //防止資料斷掉  HTML parser 在 <script> 裡面看到 </script 就會直接結束標籤
  //<script type="application/ld+json">{"name":"...</script>"}</script>
  //（"<!--" 也會觸發類似的解析狀態），而 JSON.stringify 預設不跳脫 "<"，
  //所以這裡一律把 "<" 轉成下面的 Unicode 跳脫寫法 —— 在 JSON 中與 "<" 等價，
  //解出來的字串一模一樣，不影響 Google 解讀結構化資料。
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // 這裡是刻意輸出原始 JSON；內容含後端／編輯可填的 title、description，
      // 已在上方統一跳脫 "<"。
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
