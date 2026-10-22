#!/bin/sh
set -eu
root="$1"; stage="$2"; backup="$3"; version="$4"
account=$(id -un)
test "$root" = "/home/$account/public_html"
case "$stage" in "/home/$account/.nourishland-root-stage-$version-"*) ;; *) exit 1;; esac
case "$backup" in "/home/$account/.nourishland-root-backup-$version-"*) ;; *) exit 1;; esac
test "$(readlink -f "$root")" = "$root"
test -f "$root/site/root-release.json"
grep -q '"managedBy": "root-site-release"' "$root/site/root-release.json"
test -f "$stage/files.tsv"
# Every previous hash is checked before any public file is changed.
tab=$(printf '\t')
while IFS="$tab" read -r name sha previous; do
 case "$name" in index.html|education/index.html|platform/index.html|food-forests/index.html|food-forests/story/index.html|food-forests/guide/index.html|places/index.html|immersive-learning/index.html|hillyards/index.html|collaborate/index.html|about/index.html|contact/index.html|privacy/index.html|terms/index.html|demos/index.html|xr/index.html|xr/screens/*|xr/services/*|xr/v2/*|xr/vendor/*|site/*) ;; *) echo "Unexpected path: $name"; exit 1;; esac
 case "$name" in /*|*..*|*\\*) exit 1;; esac
 case "/$name" in */.*|*//* ) echo "Hidden or empty path component"; exit 1;; esac
 case "$name" in *.html|*.js|*.mjs|*.css|*.json|*.webp|*.png|*.jpg|*.jpeg|*.svg|*.mp4|*.webm|*.wasm|*.bin|*.glb|*.gltf) ;; *) echo "Unexpected file type"; exit 1;; esac
 prefix="$root"; oldIFS="$IFS"; IFS='/'; set -- $name; IFS="$oldIFS"
 for part do prefix="$prefix/$part"; test ! -L "$prefix" || { echo "Symlink in deployment path"; exit 1; }; done
 target="$root/$name"
 test "$(sha256sum "$stage/payload/$name" | cut -d' ' -f1)" = "$sha"
 if test "$previous" = '-'; then
  test ! -e "$target" || { echo "Unexpected existing file: $name"; exit 1; }
 else
  test -f "$target" && test "$(sha256sum "$target" | cut -d' ' -f1)" = "$previous" || { echo "Production changed since baseline: $name"; exit 1; }
 fi
done < "$stage/files.tsv"
umask 077
mkdir "$backup"
cp "$stage/files.tsv" "$backup/files.tsv"
cp "$stage/manifest.json" "$backup/manifest.json"
while IFS="$tab" read -r name sha previous; do
 if test -f "$root/$name"; then mkdir -p "$backup/previous/$(dirname "$name")"; cp -p "$root/$name" "$backup/previous/$name"; fi
done < "$stage/files.tsv"
rollback(){
 trap - HUP INT TERM
 while IFS="$tab" read -r name sha previous; do
  target="$root/$name"
  # Roll back only a file still matching this release, preserving concurrent edits.
  if test -f "$target" && test "$(sha256sum "$target" | cut -d' ' -f1)" = "$sha"; then
   if test "$previous" = '-'; then rm -- "$target"; else cp -p "$backup/previous/$name" "$target"; fi
  fi
 done < "$stage/files.tsv"
 echo "Frontend overlay rolled back. Private backup: $backup" >&2
}
trap 'rollback; exit 1' HUP INT TERM
umask 022
while IFS="$tab" read -r name sha previous; do
 target="$root/$name"
 if ! mkdir -p "$(dirname "$target")"; then rollback; exit 1; fi
 # Rename within the destination directory, so each file replacement is atomic.
 if ! cp "$stage/payload/$name" "$target.nl-pending" || ! chmod 644 "$target.nl-pending" || ! mv "$target.nl-pending" "$target"; then rollback; exit 1; fi
 if test "$(sha256sum "$target" | cut -d' ' -f1)" != "$sha"; then rollback; exit 1; fi
done < "$stage/files.tsv"
trap - HUP INT TERM
printf 'Installed V%s. Private rollback backup: %s\n' "$version" "$backup"
