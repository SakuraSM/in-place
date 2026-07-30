import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AssetMapErrorBoundaryProps {
  children: ReactNode;
  onMapError: () => void;
}

interface AssetMapErrorBoundaryState {
  hasError: boolean;
}

export default class AssetMapErrorBoundary extends Component<
  AssetMapErrorBoundaryProps,
  AssetMapErrorBoundaryState
> {
  state: AssetMapErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AssetMapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('资产地图渲染失败', error, errorInfo);
    this.props.onMapError();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
