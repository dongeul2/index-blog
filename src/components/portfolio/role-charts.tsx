import { ROLES, ROLE_LABEL, ROLE_RULE, toPercent, type RoleCounts, type WeekRoles } from "@/lib/roles";

/**
 * 역할 비율 차트 — 서버에서 그리는 SVG. 자바스크립트 없이 CSS(스크롤 연동)로만 그려집니다.
 * 색은 역할 토큰(--color-role-*) 하나뿐이라 라이트·다크가 자동으로 맞습니다.
 * 같은 숫자를 화면 낭독기용 표로도 내보냅니다 — 그림만으로는 아무것도 전하지 않게.
 */

const fmtWeek = (ymd: string) => `${Number(ymd.slice(5, 7))}.${Number(ymd.slice(8, 10))}`;

/** 큰 숫자 네 개 + 어떤 커밋을 어디로 셌는지 */
export function RoleTotals({ counts }: { counts: RoleCounts }) {
  const pct = toPercent(counts);
  return (
    <dl className="role-totals">
      {ROLES.map((r) => (
        <div key={r} className="role-totals__item" data-role={r}>
          <dt>
            <span className="role-dot" data-role={r} aria-hidden="true" />
            {ROLE_LABEL[r]}
          </dt>
          <dd>
            <span className="role-totals__pct">{pct[r]}</span>
            <span className="role-totals__unit">%</span>
          </dd>
          <dd className="role-totals__rule">
            커밋 {counts[r]}개 · {ROLE_RULE[r]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 주별 누적 영역 — 네 역할을 아래에서부터 쌓습니다 */
export function RoleArea({ weeks }: { weeks: WeekRoles[] }) {
  if (weeks.length < 2) return null;

  const W = 1000;
  const H = 240;
  const PAD = 8;
  const max = Math.max(1, ...weeks.map((w) => ROLES.reduce((n, r) => n + w[r], 0)));
  const x = (i: number) => PAD + (i / (weeks.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  // 아래(기획)부터 위(운영)로 쌓은 경계선들
  const stacks = weeks.map((w) => {
    let acc = 0;
    return ROLES.map((r) => (acc += w[r]));
  });
  const layers = ROLES.map((r, ri) => {
    const top = weeks.map((_, i) => `${x(i).toFixed(1)},${y(stacks[i][ri]).toFixed(1)}`);
    const bottom = weeks
      .map((_, i) => `${x(i).toFixed(1)},${y(ri === 0 ? 0 : stacks[i][ri - 1]).toFixed(1)}`)
      .reverse();
    return { r, d: `M${top.join("L")}L${bottom.join("L")}Z` };
  });

  // 눈금 — 처음·끝과 그 사이 몇 주
  const step = Math.max(1, Math.ceil(weeks.length / 6));
  const ticks = weeks.map((w, i) => ({ i, label: fmtWeek(w.week) })).filter(({ i }) => i % step === 0 || i === weeks.length - 1);

  return (
    <figure className="role-area">
      <svg viewBox={`0 0 ${W} ${H + 28}`} className="role-area__svg" role="img" aria-labelledby="role-area-cap">
        <g className="role-area__plot">
          {layers.map(({ r, d }) => (
            <path key={r} d={d} className="role-area__layer" data-role={r} />
          ))}
        </g>
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="role-area__axis" />
        {ticks.map(({ i, label }) => (
          <text key={i} x={x(i)} y={H + 18} className="role-area__tick" textAnchor={i === 0 ? "start" : i === weeks.length - 1 ? "end" : "middle"}>
            {label}
          </text>
        ))}
      </svg>
      <figcaption id="role-area-cap" className="role-area__cap">
        주별 커밋 수를 역할별로 쌓았습니다. main에 스쿼시 병합한 PR 제목 기준이라, 한 PR 안의 테스트·문서
        커밋은 그 PR의 종류로 셉니다.
      </figcaption>
      <table className="sr-only">
        <caption>주별 역할별 커밋 수</caption>
        <thead>
          <tr>
            <th scope="col">주</th>
            {ROLES.map((r) => (
              <th key={r} scope="col">
                {ROLE_LABEL[r]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week}>
              <th scope="row">{w.week} 주</th>
              {ROLES.map((r) => (
                <td key={r}>{w[r]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** 프로젝트 하나의 역할 비율 — 가는 100% 막대 + 숫자 */
export function RoleBar({ counts }: { counts: RoleCounts }) {
  const pct = toPercent(counts);
  const shown = ROLES.filter((r) => pct[r] > 0);
  if (shown.length === 0) return null;
  return (
    <div className="role-bar">
      <div className="role-bar__track" aria-hidden="true">
        {shown.map((r) => (
          <span key={r} className="role-bar__seg" data-role={r} style={{ flexGrow: pct[r] }} />
        ))}
      </div>
      <ul className="role-bar__legend" aria-label="커밋 기준 역할 비율">
        {shown.map((r) => (
          <li key={r}>
            <span className="role-dot" data-role={r} aria-hidden="true" />
            {ROLE_LABEL[r]} {pct[r]}%
          </li>
        ))}
      </ul>
    </div>
  );
}
