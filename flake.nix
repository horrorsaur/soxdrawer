{
  description = "";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {

          buildInputs = with pkgs; [
            go gopls templ
            nodejs
          ];

          shellHook = ''
            build-sd() {
              echo "Building frontend..."
              cd web/ && npm run build && cd ..

              echo "Building index template..."
              templ generate internal/templates

              echo "Building Golang binary..."
              go build -v -o bin/sd .
            }
          '';
        };
      }
    );
}
