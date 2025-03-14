const problems = [
  {
    id: 1,
    text: "Compliance processes are fragmented and require multiple tools.",
  },
  {
    id: 2,
    text: "Traditional solutions are costly and lack transparency.",
  },
  {
    id: 3,
    text: "Audits are time-consuming and stressful for teams.",
  },
];

const solutions = [
  {
    id: 1,
    text: "Compliance processes are fragmented and require multiple tools.",
  },
  {
    id: 2,
    text: "Traditional solutions are costly and lack transparency.",
  },
  {
    id: 3,
    text: "Audits are time-consuming and stressful for teams.",
  },
];

export function Section4() {
  return (
    <section className="relative grid gap-6 py-20 px-10 md:px-6 border-b border-border/5">
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        <div className="relative z-10 h-fit w-fit flex items-center justify-center">
          <p className="bg-[#00DC73B2]/10 font-mono uppercase text-[#00DC73] text-sm h-8 px-3 border-l-2 border-[#00DC73] flex items-center gap-2">
            Our Solution
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-end justify-center gap-5">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-balance text-let text-white">
            Every framework you need to win deals
          </h2>
          <p className="text-[#E1E1E1]/70 text-left md:text-right text-balance leading-relaxed tracking-tight max-w-lg mx-0">
            Most compliance solutions are closed, costly, and complex. We&apos;re
            building an open-source platform to make SOC 2, ISO 27001, and GDPR
            accessible and affordable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border border-border/5 relative mt-10">
          <div className="h-px absolute -top-[1px] -left-5 w-5 bg-border/5" />
          <div className="h-px absolute -top-[1px] -right-5 w-5 bg-border/5" />
          <div className="h-px absolute -bottom-[1px] -right-5 w-5 bg-border/5" />
          <div className="h-px absolute -bottom-[1px] -left-5 w-5 bg-border/5" />
          <div className="w-px absolute -bottom-5 -left-[1px] h-5 bg-border/5" />
          <div className="w-px absolute -top-5 -left-[1px] h-5 bg-border/5" />
          <div className="w-px absolute -top-5 -right-[1px] h-5 bg-border/5" />
          <div className="w-px absolute -bottom-5 -right-[1px] h-5 bg-border/5" />
          <div className="flex flex-col">
            <h2 className="text-white text-lg border-b border-border/5 p-3 px-6">
              The problems
            </h2>
            <div className="flex flex-col divide-y divide-border/5">
              {problems.map((problem) => (
                <p
                  key={problem.id}
                  className="text-white flex items-start gap-3 p-6 "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0 size-5 mt-px"
                  >
                    <path
                      opacity="0.2"
                      d="M21 12C21 13.78 20.4722 15.5201 19.4832 17.0001C18.4943 18.4802 17.0887 19.6337 15.4442 20.3149C13.7996 20.9961 11.99 21.1743 10.2442 20.8271C8.49836 20.4798 6.89472 19.6226 5.63604 18.364C4.37737 17.1053 3.5202 15.5016 3.17294 13.7558C2.82567 12.01 3.0039 10.2004 3.68509 8.55585C4.36628 6.91131 5.51983 5.50571 6.99987 4.51677C8.47991 3.52784 10.22 3 12 3C14.387 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"
                      fill="white"
                      fillOpacity="0.4"
                    />
                    <path
                      d="M15.5306 9.53063L13.0603 12L15.5306 14.4694C15.6003 14.5391 15.6556 14.6218 15.6933 14.7128C15.731 14.8039 15.7504 14.9015 15.7504 15C15.7504 15.0985 15.731 15.1961 15.6933 15.2872C15.6556 15.3782 15.6003 15.4609 15.5306 15.5306C15.4609 15.6003 15.3782 15.6556 15.2872 15.6933C15.1961 15.731 15.0986 15.7504 15 15.7504C14.9015 15.7504 14.8039 15.731 14.7128 15.6933C14.6218 15.6556 14.5391 15.6003 14.4694 15.5306L12 13.0603L9.53063 15.5306C9.46095 15.6003 9.37822 15.6556 9.28718 15.6933C9.19613 15.731 9.09855 15.7504 9 15.7504C8.90146 15.7504 8.80388 15.731 8.71283 15.6933C8.62179 15.6556 8.53906 15.6003 8.46938 15.5306C8.3997 15.4609 8.34442 15.3782 8.30671 15.2872C8.269 15.1961 8.24959 15.0985 8.24959 15C8.24959 14.9015 8.269 14.8039 8.30671 14.7128C8.34442 14.6218 8.3997 14.5391 8.46938 14.4694L10.9397 12L8.46938 9.53063C8.32865 9.38989 8.24959 9.19902 8.24959 9C8.24959 8.80098 8.32865 8.61011 8.46938 8.46937C8.61011 8.32864 8.80098 8.24958 9 8.24958C9.19903 8.24958 9.3899 8.32864 9.53063 8.46937L12 10.9397L14.4694 8.46937C14.5391 8.39969 14.6218 8.34442 14.7128 8.3067C14.8039 8.26899 14.9015 8.24958 15 8.24958C15.0986 8.24958 15.1961 8.26899 15.2872 8.3067C15.3782 8.34442 15.4609 8.39969 15.5306 8.46937C15.6003 8.53906 15.6556 8.62178 15.6933 8.71283C15.731 8.80387 15.7504 8.90145 15.7504 9C15.7504 9.09855 15.731 9.19613 15.6933 9.28717C15.6556 9.37822 15.6003 9.46094 15.5306 9.53063ZM21.75 12C21.75 13.9284 21.1782 15.8134 20.1068 17.4168C19.0355 19.0202 17.5127 20.2699 15.7312 21.0078C13.9496 21.7458 11.9892 21.9389 10.0979 21.5627C8.20656 21.1865 6.46928 20.2579 5.10571 18.8943C3.74215 17.5307 2.81355 15.7934 2.43735 13.9021C2.06114 12.0108 2.25422 10.0504 2.99218 8.26884C3.73013 6.48726 4.97982 4.96451 6.58319 3.89317C8.18657 2.82183 10.0716 2.25 12 2.25C14.585 2.25273 17.0634 3.28084 18.8913 5.10872C20.7192 6.93661 21.7473 9.41498 21.75 12ZM20.25 12C20.25 10.3683 19.7661 8.77325 18.8596 7.41655C17.9531 6.05984 16.6646 5.00242 15.1571 4.37799C13.6497 3.75357 11.9909 3.59019 10.3905 3.90852C8.79017 4.22685 7.32016 5.01259 6.16637 6.16637C5.01259 7.32015 4.22685 8.79016 3.90853 10.3905C3.5902 11.9908 3.75358 13.6496 4.378 15.1571C5.00242 16.6646 6.05984 17.9531 7.41655 18.8596C8.77326 19.7661 10.3683 20.25 12 20.25C14.1873 20.2475 16.2843 19.3775 17.8309 17.8309C19.3775 16.2843 20.2475 14.1873 20.25 12Z"
                      fill="white"
                      fillOpacity="0.4"
                    />
                  </svg>
                  <span className="text-white/70 max-w-xs mx-0">
                    {problem.text}
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="flex flex-col bg-[#212226] rounded-2xl shadow-[0px_0px_0px_1px_#2D2E32]">
            <h2 className="text-white text-lg border-b border-border/5 p-3 px-6">
              Our solution
            </h2>
            <div className="flex flex-col divide-y divide-border/5">
              {solutions.map((solution) => (
                <p
                  key={solution.id}
                  className="text-white flex items-start gap-2 p-6"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="flex-shrink-0 size-5 mt-px"
                  >
                    <path
                      opacity="0.2"
                      d="M21 12C21 13.78 20.4722 15.5201 19.4832 17.0001C18.4943 18.4802 17.0887 19.6337 15.4442 20.3149C13.7996 20.9961 11.99 21.1743 10.2442 20.8271C8.49836 20.4798 6.89472 19.6226 5.63604 18.364C4.37737 17.1053 3.5202 15.5016 3.17294 13.7558C2.82567 12.01 3.0039 10.2004 3.68509 8.55585C4.36628 6.91131 5.51983 5.50571 6.99987 4.51677C8.47991 3.52784 10.22 3 12 3C14.387 3 16.6761 3.94821 18.364 5.63604C20.0518 7.32387 21 9.61305 21 12Z"
                      fill="#00DC73"
                    />
                    <path
                      d="M16.2806 9.21937C16.3504 9.28903 16.4057 9.37175 16.4434 9.46279C16.4812 9.55384 16.5006 9.65144 16.5006 9.75C16.5006 9.84856 16.4812 9.94616 16.4434 10.0372C16.4057 10.1283 16.3504 10.211 16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.289 9.14964 15.3718 9.09432 15.4628 9.05658C15.5538 9.01884 15.6514 8.99941 15.75 8.99941C15.8486 8.99941 15.9462 9.01884 16.0372 9.05658C16.1283 9.09432 16.211 9.14964 16.2806 9.21937ZM21.75 12C21.75 13.9284 21.1782 15.8134 20.1068 17.4168C19.0355 19.0202 17.5127 20.2699 15.7312 21.0078C13.9496 21.7458 11.9892 21.9389 10.0979 21.5627C8.20656 21.1865 6.46928 20.2579 5.10571 18.8943C3.74215 17.5307 2.81355 15.7934 2.43735 13.9021C2.06114 12.0108 2.25422 10.0504 2.99218 8.26884C3.73013 6.48726 4.97982 4.96451 6.58319 3.89317C8.18657 2.82183 10.0716 2.25 12 2.25C14.585 2.25273 17.0634 3.28084 18.8913 5.10872C20.7192 6.93661 21.7473 9.41498 21.75 12ZM20.25 12C20.25 10.3683 19.7661 8.77325 18.8596 7.41655C17.9531 6.05984 16.6646 5.00242 15.1571 4.37799C13.6497 3.75357 11.9909 3.59019 10.3905 3.90852C8.79017 4.22685 7.32016 5.01259 6.16637 6.16637C5.01259 7.32015 4.22685 8.79016 3.90853 10.3905C3.5902 11.9908 3.75358 13.6496 4.378 15.1571C5.00242 16.6646 6.05984 17.9531 7.41655 18.8596C8.77326 19.7661 10.3683 20.25 12 20.25C14.1873 20.2475 16.2843 19.3775 17.8309 17.8309C19.3775 16.2843 20.2475 14.1873 20.25 12Z"
                      fill="#00DC73"
                    />
                  </svg>
                  <span className="max-w-xs mx-0">{solution.text}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
