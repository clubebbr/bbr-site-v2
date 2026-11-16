# Configuração do painel de punições BBR

O painel em /punicoes usa Cloudflare Pages Functions e Cloudflare D1.

1. No Cloudflare, crie um banco D1 exclusivo para as punições (por exemplo, `bbr-punicoes`).
2. Em Workers & Pages > projeto do site > Settings > Bindings, adicione o banco D1 com o nome exato `PUNICOES_DB`. Configure o binding também para o ambiente de produção e faça um novo deploy.
3. No console do banco D1, execute o arquivo `punicoes/schema.sql` para criar a tabela.
4. Execute o arquivo de importação privada SQL gerado a partir da planilha **diretamente no banco**. Esse arquivo contém contatos pessoais: **nunca o envie ao GitHub ou o coloque em uma pasta pública do site**.
5. Em Settings > Variables and Secrets, adicione o segredo `PUNICOES_ADMIN_PASSWORD` com uma senha forte de pelo menos 12 caracteres. Use o tipo Secret e faça novo deploy.
6. Abra `/punicoes` para consultar e use o botão "Acesso do responsável" para editar. A senha não é salva no navegador; ao atualizar a página será necessário informá-la novamente.

## Segurança
- A rota GET `/api/punicoes` pública retorna dados sem `contato`.
- A leitura administrativa `?admin=1`, inclusão, alteração e exclusão exigem a senha no cabeçalho `X-BBR-Admin-Password`.
- A página não aparece no menu principal e usa `noindex`, mas seu endereço é público.
- Não exponha a senha, os arquivos SQL privados ou os números de contato no repositório.
- Faça backup periódico do D1. A exclusão no painel é definitiva.
- A senha compartilhada é adequada somente para um responsável; não compartilhe com os demais administradores.
