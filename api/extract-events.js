export default async function handler(req, res) {
  return res.status(200).json({ name: "Live-Act", time: "20:00" });
}
