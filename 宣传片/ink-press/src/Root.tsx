import { Composition } from 'remotion';
import { AiflMain, NEON_TOTAL } from './aifl/Main';
import { Neon30Main, NEON30_TOTAL } from './aifl/Neon30';

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="NeonFrontierPromo" component={AiflMain} durationInFrames={NEON_TOTAL} fps={30} width={1920} height={1080} />
      <Composition id="NeonFrontierPromo30s" component={Neon30Main} durationInFrames={NEON30_TOTAL} fps={30} width={1920} height={1080} />
    </>
  );
};
