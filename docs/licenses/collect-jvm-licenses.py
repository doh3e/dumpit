"""Collect declared/BOM-selected Maven evidence; this is not a Gradle resolver.

Usage: python collect-jvm-licenses.py --cache <Gradle files-2.1> [--fetch]
Only Maven Central and Google Maven POMs are fetched. Cached JAR/AAR notices
are copied byte-for-byte. No product source, build configuration, or Git changes.
"""
import argparse
import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
parser.add_argument('--fetch', action='store_true')
parser.add_argument('--resolved', type=Path, required=True, help='JSON emitted by the isolated Gradle metadata resolution task')
args = parser.parse_args()
root = Path(__file__).resolve().parent
out = root / 'jvm'
out.mkdir(parents=True, exist_ok=True)
ns = {'m': 'http://maven.apache.org/POM/4.0.0'}
models = {}
downloads = {}
errors = []


def val(node, path, default=''):
    found = node.find('/'.join('m:' + p for p in path.split('/')), ns)
    return found.text.strip() if found is not None and found.text else default


def subst(value, props):
    for _ in range(15):
        new = re.sub(r'\$\{([^}]+)\}', lambda m: props.get(m[1], m[0]), value)
        if new == value:
            return new
        value = new
    return value


def url_for(g, a, v):
    base = 'https://dl.google.com/dl/android/maven2/' if g.startswith(('androidx.', 'com.google.android.', 'com.android.')) or (g == 'com.google.firebase' and a != 'firebase-admin') else 'https://repo.maven.apache.org/maven2/'
    return f'{base}{g.replace(".", "/")}/{a}/{v}/{a}-{v}.pom'


def model(g, a, v):
    key = (g, a, v)
    if key in models:
        return models[key]
    empty = {'props': {}, 'managed': {}, 'licenses': [], 'pom': None, 'license_pom': None}
    models[key] = empty
    files = sorted((args.cache / g / a / v).glob('*/*.pom'))
    pom = files[0] if files else None
    remote = out / 'downloaded-poms' / f'{g}__{a}__{v}.pom'
    if pom is None and remote.exists():
        pom = remote
    if pom is None and args.fetch and '$' not in v:
        url = url_for(g, a, v)
        try:
            data = urllib.request.urlopen(url, timeout=15).read()
            ET.fromstring(data)
            remote.parent.mkdir(parents=True, exist_ok=True)
            remote.write_bytes(data)
            downloads[str(remote.relative_to(root))] = url
            pom = remote
        except Exception as exc:
            errors.append({'coordinate': ':'.join(key), 'url': url, 'error': str(exc)})
    if pom is None:
        return empty
    doc = ET.parse(pom).getroot()
    parent = doc.find('m:parent', ns)
    inherited = model(val(parent, 'groupId'), val(parent, 'artifactId'), val(parent, 'version')) if parent is not None else empty
    props = dict(inherited['props'])
    props.update({'project.version': v, 'pom.version': v, 'project.groupId': g})
    prop_node = doc.find('m:properties', ns)
    if prop_node is not None:
        props.update({x.tag.split('}')[-1]: (x.text or '').strip() for x in prop_node})
    props = {k: subst(x, props) for k, x in props.items()}
    managed = dict(inherited['managed'])
    dependencies = doc.findall('m:dependencyManagement/m:dependencies/m:dependency', ns)
    # Import precedence is sufficient for this evidence selector, not a resolver.
    for dep in dependencies:
        dg, da, dv = [subst(val(dep, x), props) for x in ['groupId', 'artifactId', 'version']]
        if val(dep, 'scope') == 'import' and dv:
            for k, value in model(dg, da, dv)['managed'].items():
                managed.setdefault(k, value)
    for dep in dependencies:
        if val(dep, 'scope') != 'import':
            dg, da, dv = [subst(val(dep, x), props) for x in ['groupId', 'artifactId', 'version']]
            if dv:
                managed[(dg, da)] = dv
    licenses = [{'name': val(x, 'name'), 'url': val(x, 'url')} for x in doc.findall('m:licenses/m:license', ns)]
    result = {'props': props, 'managed': managed, 'licenses': licenses or inherited['licenses'], 'pom': str(pom), 'license_pom': str(pom) if licenses else inherited['license_pom']}
    models[key] = result
    return result


boot = model('org.springframework.boot', 'spring-boot-dependencies', '4.1.0')['managed']
firebase = model('com.google.firebase', 'firebase-admin', '9.4.3')['managed']
selected = []


def add(scope, coordinate, basis):
    g, a, *version = coordinate.split(':')
    v = version[0] if version else boot.get((g, a)) or firebase.get((g, a))
    if not v:
        errors.append({'coordinate': coordinate, 'error': 'BOM version not determined'})
        return
    selected.append((scope, g, a, v, basis))


direct = '''spring-boot-starter-webmvc spring-boot-starter-restclient spring-boot-starter-data-jpa spring-boot-starter-security spring-boot-starter-security-oauth2-client spring-boot-starter-data-redis spring-boot-starter-validation spring-boot-starter-flyway'''.split()
for artifact in direct:
    add('backend', 'org.springframework.boot:' + artifact, '직접 선언 + Boot 4.1.0 BOM')
for coord in ['org.springframework.security:spring-security-oauth2-jose', 'org.springframework.session:spring-session-data-redis', 'org.flywaydb:flyway-database-postgresql', 'org.postgresql:postgresql']:
    add('backend', coord, '직접 선언 + Boot 4.1.0 BOM')
for coord in ['javax.xml.bind:jaxb-api:2.3.1', 'io.sentry:sentry-spring-boot-4:8.44.1', 'com.google.firebase:firebase-admin:9.4.3']:
    add('backend', coord, 'build.gradle 직접 고정')
for coord in '''org.springframework:spring-core org.springframework:spring-webmvc org.springframework:spring-web org.springframework:spring-jdbc org.springframework:spring-orm org.springframework:spring-context org.springframework.data:spring-data-jpa org.springframework.data:spring-data-redis org.springframework.security:spring-security-core org.springframework.security:spring-security-web org.springframework.security:spring-security-oauth2-client org.springframework.session:spring-session-core org.hibernate.orm:hibernate-core org.hibernate.validator:hibernate-validator io.lettuce:lettuce-core io.netty:netty-common io.netty:netty-buffer io.netty:netty-transport io.netty:netty-handler io.netty:netty-codec-http io.projectreactor:reactor-core org.reactivestreams:reactive-streams org.flywaydb:flyway-core org.apache.tomcat.embed:tomcat-embed-core org.apache.tomcat.embed:tomcat-embed-el jakarta.xml.bind:jakarta.xml.bind-api org.glassfish.jaxb:jaxb-runtime jakarta.activation:jakarta.activation-api jakarta.annotation:jakarta.annotation-api jakarta.persistence:jakarta.persistence-api jakarta.transaction:jakarta.transaction-api jakarta.validation:jakarta.validation-api org.eclipse.angus:angus-activation org.slf4j:slf4j-api ch.qos.logback:logback-classic ch.qos.logback:logback-core com.zaxxer:HikariCP com.nimbusds:nimbus-jose-jwt org.apache.httpcomponents.client5:httpclient5 org.apache.httpcomponents.core5:httpcore5 tools.jackson.core:jackson-databind tools.jackson.core:jackson-core com.fasterxml.jackson.core:jackson-annotations org.yaml:snakeyaml'''.split():
    add('backend-major-transitive', coord, '관련 전이 구성의 Boot 4.1.0 BOM 관리값; 실제 선택 그래프 미확인')
for coord in '''com.google.api-client:google-api-client com.google.api-client:google-api-client-gson com.google.http-client:google-http-client com.google.http-client:google-http-client-gson com.google.api:api-common com.google.auth:google-auth-library-oauth2-http com.google.auth:google-auth-library-credentials com.google.cloud:google-cloud-storage com.google.cloud:google-cloud-firestore com.google.guava:guava io.grpc:grpc-core io.grpc:grpc-netty-shaded io.grpc:grpc-protobuf com.google.protobuf:protobuf-java'''.split():
    add('backend-google-transitive', coord, 'Firebase Admin 9.4.3 POM/BOM 또는 Boot BOM 관리값; 실제 충돌 선택 미확인')
for coord in ['javax.activation:javax.activation-api:1.2.0', 'io.sentry:sentry:8.44.1', 'io.sentry:sentry-spring-boot-jakarta:8.44.1', 'io.sentry:sentry-spring-jakarta:8.44.1']:
    add('backend-major-transitive', coord, 'JAXB/Sentry 고정 의존성 POM 계열; 실제 선택 그래프 미확인')
for coord in ['org.projectlombok:lombok', 'org.springframework.boot:spring-boot-starter-test', 'org.springframework.boot:spring-boot-starter-webmvc-test', 'org.springframework.boot:spring-boot-starter-security-test']:
    add('backend-build-test', coord, 'compileOnly/annotationProcessor/test 직접 선언 + Boot BOM; 배포 runtime 아님')
for coord in ['androidx.glance:glance-appwidget:1.1.1', 'androidx.glance:glance:1.1.1', 'com.squareup.okhttp3:okhttp:4.12.0', 'com.google.firebase:firebase-bom:34.15.0', 'com.google.android.gms:play-services-auth:21.5.0', 'com.facebook.react:react-android:0.86.3']:
    add('android', coord, '위젯/RNFirebase/RN 패키지 선언; 로컬 Android releaseRuntimeClasspath 해석 미완료')
android_bom = model('com.google.firebase', 'firebase-bom', '34.15.0')['managed']
for name in ['firebase-common', 'firebase-messaging']:
    version = android_bom.get(('com.google.firebase', name))
    if version:
        add('android', f'com.google.firebase:{name}:{version}', 'RNFirebase 직접 선언 + Firebase BOM 34.15.0; 실제 선택 미확인')
    else:
        errors.append({'coordinate': 'com.google.firebase:' + name, 'error': 'Firebase BOM unavailable; version not asserted'})


if args.resolved:
    graph = json.loads(args.resolved.read_text(encoding='utf-8-sig'))
    if graph.get('unresolved'):
        raise RuntimeError('Unresolved Gradle dependencies: ' + repr(graph['unresolved']))
    old = {(g, a): (scope, basis) for scope, g, a, v, basis in selected}
    selected = [row for row in selected if row[0] in {'android', 'backend-build-test'}]
    for item in graph['components']:
        g, a, v = (item[k] for k in ['group', 'name', 'version'])
        if not g or v == 'unspecified':
            continue
        scope = 'backend-resolved-metadata' if a.endswith(('-bom', '-dependencies', '-platform')) else 'backend-resolved-runtime'
        selected.append((scope, g, a, v, '임시 Java 프로젝트: 현재 runtime 직접 선언 + enforced Boot 4.1.0 BOM, Gradle 8.14.5 해석; 실제 배포 JAR 검사 아님'))
    known = {f'{g}:{a}' for _, g, a, _, _ in selected}
    errors = [error for error in errors if error.get('coordinate') not in known]


def preserve(path, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    data = Path(path).read_bytes()
    target.write_bytes(data)
    return {'path': str(target.relative_to(root)).replace('\\', '/'), 'sha256': hashlib.sha256(data).hexdigest()}


rows = []
for scope, g, a, v, basis in selected:
    info = model(g, a, v)
    dest = out / f'{g}__{a}__{v}'
    evidence = []
    for key, name in [('pom', 'artifact.pom'), ('license_pom', 'license-source.pom')]:
        if info[key]:
            evidence.append(preserve(info[key], dest / name))
    archives = sorted((args.cache / g / a / v).glob('*/*'))
    for archive in archives:
        if archive.suffix not in {'.jar', '.aar'} or archive.name.endswith(('-sources.jar', '-javadoc.jar')):
            continue
        with zipfile.ZipFile(archive) as zipped:
            for entry in zipped.infolist():
                basename = Path(entry.filename).name
                if entry.is_dir() or not re.match(r'(?i)^(license|notice|copying|copyright|third_party_licenses)([._-]|$)', basename):
                    continue
                if entry.file_size > 2_000_000 or '..' in Path(entry.filename).parts or Path(entry.filename).is_absolute():
                    continue
                data = zipped.read(entry)
                if b'\x00' in data:
                    continue
                target = dest / 'archive' / entry.filename
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                evidence.append({'path': str(target.relative_to(root)).replace('\\', '/'), 'sha256': hashlib.sha256(data).hexdigest(), 'archive': archive.name, 'entry': entry.filename})
    rows.append({'scope': scope, 'coordinate': f'{g}:{a}:{v}', 'versionBasis': basis, 'licenses': info['licenses'], 'officialPom': url_for(g, a, v), 'evidence': evidence})
payload = {'method': 'isolated Gradle runtime metadata resolution plus declared Android/BOM evidence; NOT a shipped artifact SBOM' if args.resolved else 'declaration-and-BOM-evidence; NOT a resolved Gradle or shipped artifact SBOM', 'rows': rows, 'retrievalErrors': errors, 'downloadSources': downloads}
upstream = {
    'logback-1.5.34-LICENSE.txt': 'https://raw.githubusercontent.com/qos-ch/logback/v_1.5.34/LICENSE.txt',
    'logback-EPL-2.0.txt': 'https://www.eclipse.org/org/documents/epl-2.0/EPL-2.0.txt',
    'logback-LGPL-2.1.txt': 'https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt',
    'sentry-java-8.44.1-LICENSE': 'https://raw.githubusercontent.com/getsentry/sentry-java/8.44.1/LICENSE',
    'firebase-admin-9.4.3-LICENSE': 'https://raw.githubusercontent.com/firebase/firebase-admin-java/v9.4.3/LICENSE',
}
source_records = []
for name, url in upstream.items():
    target = out / 'upstream' / name
    record = {'path': str(target.relative_to(root)).replace('\\', '/'), 'url': url}
    try:
        if not target.exists() and args.fetch:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(urllib.request.urlopen(url, timeout=15).read())
        if target.exists():
            record['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        else:
            record['error'] = 'not fetched'
    except Exception as exc:
        record['error'] = str(exc)
    source_records.append(record)
payload['upstreamLicenseSources'] = source_records
(out / 'inventory.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
intro = '''# JVM·Android Maven 의존성 라이선스 근거

2026-09-14 소스 기준 조사다. 백엔드의 현재 runtime 직접 선언과 Spring Boot 4.1.0 BOM을 격리한 Gradle 프로젝트에서 해석하고, 각 버전의 POM 및 로컬 JAR/AAR에 들어 있는 라이선스·NOTICE 원문을 수집했다. 앱 자체 소스의 라이선스 선택과 제삼자 라이선스는 별개다.

## 범위와 버전 확인 수준

- **백엔드:** [build.gradle](../../backend/build.gradle)의 runtime 선언을 임시 Java 프로젝트에 옮기고 `enforcedPlatform('org.springframework.boot:spring-boot-dependencies:4.1.0')`으로 BOM 관리값을 적용했다. Gradle 8.14.5에서 공식 Maven Central·Google Maven 메타데이터 해석 결과 **228개 라이브러리 + 6개 BOM/플랫폼 = 외부 component 234개, 미해결 0개**다. [해석 결과](./jvm/backend-resolution.json), [임시 구성](./jvm/backend-resolution.gradle.txt), [수집 task](./jvm/backend-resolution-init.gradle.txt)를 보존했다.
- 이는 현재 의존성 선언을 재현한 메타데이터 그래프다. **원 프로젝트의 Spring dependency-management 플러그인을 거친 실제 runtimeClasspath, 운영 JAR의 BOOT-INF/lib 또는 배포 컨테이너를 확정한 SBOM은 아니다.** 원 프로젝트 offline 해석은 캐시에 플러그인 marker가 없어 실패했다. 버전 충돌 규칙·플러그인에 의한 추가 의존성·프로필 차이는 실제 산출물과 후속 대조할 부분이다. 원 프로젝트의 Gradle 플러그인 3종과 그 전이 의존성도 runtime 목록에 포함시키지 않았다.
- **빌드·테스트:** Lombok과 테스트 starter 직접 선언 4개만 별도 표에 기록했다. 전체 testRuntimeClasspath와 빌드 도구 의존성을 수집한 것은 아니다.
- **Android:** 위젯의 [Gradle 선언](../../mobile/modules/dumpit-widget/android/build.gradle), [mobile lockfile](../../mobile/package-lock.json)과 설치된 동일 버전 npm 패키지의 Android 설정을 확인했다. Glance/OkHttp/RN/Google Auth 및 Firebase BOM·common·messaging **8개 좌표**를 조사했다. 실제 releaseRuntimeClasspath 전체 및 APK/AAB 내 네이티브 바이너리는 미확정이다. RN/Expo의 npm 라이선스만으로 Maven 라이브러리의 라이선스를 대신하지 않는다.

| Android 근거 | 확인한 선언/관리값 | 확인 수준 |
|---|---|---|
| dumpit-widget | glance-appwidget 1.1.1, okhttp 4.12.0 | 저장소 직접 선언; glance 1.1.1은 appwidget POM 전이 구성 |
| react-native 0.86.3 | react-android 0.86.3 | npm 버전 및 ReactAndroid gradle.properties |
| @react-native-firebase/app 25.1.0 | Firebase BOM 34.15.0, play-services-auth 21.5.0 | package.json sdkVersions 및 android/build.gradle |
| @react-native-google-signin/google-signin 16.1.2 | play-services-auth 기본 21.4.0 | 별도 선언이 존재함; RNFirebase의 21.5.0과 최종 충돌 선택은 실제 Android graph에서 재확인 |
| Firebase BOM 34.15.0 | firebase-common 22.1.0, firebase-messaging 25.1.0 | 공식 Google Maven의 해당 BOM POM 관리값 |

AndroidX Compose·Lifecycle·WorkManager·DataStore, Google Play services의 base/basement/tasks 및 각 SDK의 추가 Maven 전이는 위 8개만으로 완결되지 않는다. Android Gradle offline 해석은 foojay plugin marker 미확보로 실패했다. 캐시 전체를 앱에서 쓰는 라이브러리로 나열하거나 캐시의 최신 버전을 사용 버전으로 대체하지 않았다.

## 라이선스 해석에서 구분할 항목

- **Hibernate ORM 7.4.1.Final은 Apache-2.0**으로 POM과 배포 JAR LICENSE에 명시되어 있다. 과거 Hibernate 버전의 LGPL 정보를 적용하지 않는다. [공식 프로젝트 설명](https://hibernate.org/community/license/)
- **Logback 1.5.34는 EPL-2.0 또는 LGPL-2.1 선택 구조**다. POM의 복수 license 항목을 두 라이선스의 동시 적용으로 단정하지 않는다. [공식 설명](https://logback.qos.ch/license.html)과 [해당 버전 고지](./jvm/upstream/logback-1.5.34-LICENSE.txt)를 확인했다.
- **javax JAXB 2.3.1·Activation 1.2.0·Annotation 1.3.2와 Jakarta API 일부에는 CDDL/EPL/GPL 및 Classpath Exception 표기가 있다.** 현대 Jakarta JAXB 구현의 EDL과 구분해야 한다. 아래 표는 POM의 표기를 그대로 보존한다. 원문에 있는 선택·예외·재배포 조건을 읽지 않고 앱 전체에 GPL이 적용된다거나 아무 조건이 없다고 결론 내리지 않는다.
- **Google Play services Auth 21.5.0은 POM에 Android SDK License를 명시한다.** 이를 Apache-2.0 OSS로 일괄 분류하지 않는다. AAR의 [third_party_licenses.txt](./jvm/com.google.android.gms__play-services-auth__21.5.0/archive/third_party_licenses.txt)와 [인덱스](./jvm/com.google.android.gms__play-services-auth__21.5.0/archive/third_party_licenses.json)를 별도로 보존했다. [공식 약관](https://developer.android.com/studio/terms)과 [Google OSS 고지 안내](https://developers.google.com/android/guides/opensource)를 함께 확인해야 한다.
- **gRPC Netty shaded** 등은 라이브러리 자체 라이선스 외에 포함된 BoringSSL·Tomcat native 등의 고지가 있다. 발견된 내장 원문을 보존했으며 단일 POM 이름으로 축약하지 않았다.

## 원문과 미확인 범위

[inventory.json](./jvm/inventory.json)에 좌표·버전 근거·POM의 라이선스 이름/URL·보존 파일 SHA-256·JAR/AAR 내부 경로를 기록했다. POM URL은 Maven 공식 배포 원본이며 로컬 사본도 함께 둔다. 부모 POM에서 라이선스를 상속한 경우 `license-source.pom`을 별도로 보존했다. 표의 `원문 미확보`는 라이선스가 없다는 뜻이 아니라 해당 좌표의 로컬 아카이브에서 이름으로 식별할 수 있는 원문을 확보하지 못했다는 뜻이다. POM 메타데이터 자체는 전체 246개 좌표에서 확인했다.

추가로 Sentry Java 8.44.1·Firebase Admin 9.4.3의 공식 태그 LICENSE 및 Logback 고지/EPL 전문을 `jvm/upstream/`에 보존했다. 다운로드 실패는 inventory의 `upstreamLicenseSources`에 성공과 구분하여 남긴다. 전체 배포물의 소스 제공 의무·notice 노출 위치·수정된 제삼자 코드 유무·재배포 조건 이행 여부를 이 조사만으로 완료 처리하지 않는다. Android의 최종 AAB/APK, JVM JAR, Electron/웹 npm 및 폰트·이미지 에셋은 각각 실제 배포물과 대조해야 한다.

이 목록을 만들기 위해 앱 빌드·Sentry 업로드·운영 API/DB 호출·배포는 실행하지 않았다. 원문을 수정해 앱 자체 저작권으로 바꾸지 않았다.

## 재수집

제품 Gradle 설정은 수정하지 않는다. 위에 보존한 임시 구성/task로 metadata resolution JSON을 만든 후 다음 명령을 저장소 루트에서 실행한다. `--fetch`는 공식 Maven/Google POM과 지정된 공식 라이선스 원문에만 접근한다.

```powershell
python docs/licenses/collect-jvm-licenses.py --cache "$env:USERPROFILE/.gradle/caches/modules-2/files-2.1" --resolved docs/licenses/jvm/backend-resolution.json --fetch
```

버전 변경 후에는 임시 구성도 현재 build.gradle과 다시 대조해야 한다. 수집기는 Maven POM의 버전 선택을 Gradle 해석의 대체물로 사용하지 않는다. Android 항목은 직접 선언/BOM이라는 별도 확인 수준을 유지한다.
'''
sections = [('backend-resolved-runtime', '백엔드 runtime 메타데이터 해석 목록'), ('backend-resolved-metadata', '백엔드 BOM·플랫폼 메타데이터'), ('backend-build-test', '백엔드 빌드·테스트 직접 선언'), ('android', 'Android 직접 선언·BOM 확인 목록')]
parts = [intro]
for scope, title in sections:
    parts.append(f'\n## {title}\n\n| Maven 좌표·버전 / 공식 POM | POM 라이선스 표기 | 보존 근거 |\n|---|---|---|\n')
    for row in sorted((r for r in rows if r['scope'] == scope), key=lambda r: r['coordinate']):
        names = '; '.join(x['name'].replace('|', '\\|') for x in row['licenses']) or '미확인'
        links = []
        for evidence in row['evidence']:
            p = evidence['path']
            if p.endswith('/artifact.pom'):
                links.append(f'[POM](./{p})')
            elif p.endswith('/license-source.pom'):
                if row['evidence'][0]['sha256'] != evidence['sha256']:
                    links.append(f'[상속 POM](./{p})')
            elif 'entry' in evidence:
                links.append(f'[{Path(p).name}](./{p})')
        if not any('entry' in e for e in row['evidence']):
            links.append('아카이브 원문 미확보')
        parts.append(f"| [{row['coordinate']}]({row['officialPom']}) | {names} | {' · '.join(links)} |\n")
(root / 'JVM_DEPENDENCIES.md').write_text(''.join(parts), encoding='utf-8')
print(json.dumps({'rows': len(rows), 'missingLicenseMetadata': [r['coordinate'] for r in rows if not r['licenses']], 'retrievalErrors': len(errors)}, ensure_ascii=False))
