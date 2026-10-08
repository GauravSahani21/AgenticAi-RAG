/** Decorative CSS geometry: no canvas, network assets or animation dependency. */
export function LearningSculpture() {
  return <div className="learning-sculpture" aria-hidden="true">
    <div className="sculpture-orbit" />
    <div className="sculpture-stack"><i /><i /><i /><i /></div>
    <span className="sculpture-dot" />
  </div>;
}
